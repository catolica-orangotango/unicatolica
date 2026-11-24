package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** {@code POST /auth/registro}: aceite dos Termos e da Política de Privacidade (KAN-131). */
@QuarkusTest
class CadastroResourceTest {

    @Inject
    UsuarioRepository usuarioRepository;

    @Test
    void comAceiteGravaInstanteEVersaoDosTermos() {
        String email = emailUnico();

        given().contentType(JSON).body(corpo(email, true))
                .when().post("/auth/registro")
                .then().statusCode(201);

        Usuario usuario = QuarkusTransaction.requiringNew()
                .call(() -> usuarioRepository.buscarPorEmail(email).orElseThrow());
        assertNotNull(usuario.termosAceitosEm);
        assertEquals("0.1-provisoria", usuario.termosVersao);
    }

    @Test
    void aceiteFalsoDa422ENaoCriaConta() {
        String email = emailUnico();

        given().contentType(JSON).body(corpo(email, false))
                .when().post("/auth/registro")
                .then().statusCode(422)
                .body("error.code", equalTo("TERMOS_NAO_ACEITOS"));

        assertFalse(QuarkusTransaction.requiringNew().call(() -> usuarioRepository.existePorEmail(email)));
    }

    @Test
    void aceiteAusenteDa422() {
        String email = emailUnico();
        Map<String, Object> corpo = corpo(email, true);
        corpo.remove("aceiteTermos");

        given().contentType(JSON).body(corpo)
                .when().post("/auth/registro")
                .then().statusCode(422)
                .body("error.code", equalTo("TERMOS_NAO_ACEITOS"));

        assertFalse(QuarkusTransaction.requiringNew().call(() -> usuarioRepository.existePorEmail(email)));
    }

    private static Map<String, Object> corpo(String email, boolean aceite) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("nome", "Aluno Termos");
        corpo.put("email", email);
        corpo.put("senha", UsuarioDeTeste.SENHA);
        corpo.put("cursoId", UsuarioDeTeste.idDoCurso("Administração"));
        corpo.put("dataNascimento", "2000-01-01");
        corpo.put("aceiteTermos", aceite);
        return corpo;
    }

    private static String emailUnico() {
        return "termos." + System.nanoTime() + "@catolicasc.edu.br";
    }
}
