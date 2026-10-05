package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste.Sessao;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * KAN-78: a sessão expira por inatividade. O token do login e o de {@code POST /auth/refresh}
 * valem os 15 minutos de {@code identidade.sessao.inatividade-minutos}; o refresh exige token
 * válido e não renova sessão encerrada por logout. Antes, sem {@code expiresIn}, o SmallRye
 * emitia o token com validade de 5 minutos e não havia como renovar.
 *
 * <p>Cada teste usa um aluno próprio: o logout invalida a sessão do usuário.</p>
 */
@QuarkusTest
class SessaoValidadeFluxoTest {

    private static final long QUINZE_MINUTOS = 15 * 60;

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    @Test
    void tokenDoLoginValeOTempoDeInatividade() throws Exception {
        String token = usuarioDeTeste.novo("Administração").token();

        assertEquals(QUINZE_MINUTOS, validadeEmSegundos(token));
    }

    @Test
    void refreshDevolveTokenNovoQueAbreRotaAutenticada() throws Exception {
        Sessao sessao = usuarioDeTeste.novo("Administração");

        String novo = sessao.autenticado()
                .when().post("/auth/refresh")
                .then().statusCode(200)
                .extract().path("token");

        assertEquals(QUINZE_MINUTOS, validadeEmSegundos(novo));
        given().header("Authorization", "Bearer " + novo)
                .when().get("/usuarios/me")
                .then().statusCode(200)
                .body("id", equalTo((int) sessao.id()));
    }

    @Test
    void refreshSemTokenResponde401() {
        given().when().post("/auth/refresh")
                .then().statusCode(401)
                .body("error.code", equalTo("NAO_AUTENTICADO"));
    }

    @Test
    void refreshDepoisDoLogoutResponde401() {
        Sessao sessao = usuarioDeTeste.novo("Administração");
        sessao.autenticado().when().post("/auth/logout").then().statusCode(204);

        sessao.autenticado()
                .when().post("/auth/refresh")
                .then().statusCode(401)
                .body("error.code", equalTo("NAO_AUTENTICADO"));
    }

    private static long validadeEmSegundos(String token) throws Exception {
        String payloadJson = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]));
        Map<?, ?> payload = new ObjectMapper().readValue(payloadJson, Map.class);
        return ((Number) payload.get("exp")).longValue() - ((Number) payload.get("iat")).longValue();
    }
}
