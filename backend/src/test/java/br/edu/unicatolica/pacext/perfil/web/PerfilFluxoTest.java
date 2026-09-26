package br.edu.unicatolica.pacext.perfil.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;

import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Prova end-to-end sobre o pipeline JPA/Hibernate real (Testcontainers/Dev Services) —
 * os testes de {@code PerfilServiceTest} usam um repositório mockado, então nunca
 * disparariam o {@code ConstraintViolationException} que só aparece com Postgres de
 * verdade (a coluna de ordem do Hibernate, ver javadoc de
 * {@code PerfilAcademico.interesses}). Mesmo padrão de {@code AutenticacaoFluxoTest}.
 *
 * <p>Registra um usuário próprio por teste (em vez do e-mail-semente fixo que
 * {@code AutenticacaoFluxoTest} também usa) de propósito: aquele teste faz logout desse
 * e-mail, e os dois rodam na mesma sessão de {@code mvn test} contra o mesmo Postgres —
 * reusar o mesmo e-mail cria uma corrida real entre classes de teste (sessão invalidada
 * por uma classe enquanto outra ainda usa o token).</p>
 */
@QuarkusTest
class PerfilFluxoTest {

    @Inject
    UsuarioRepository usuarioRepository;

    @Test
    void salvarComVariosInteressesPersisteENaReleituraMantemAOrdem() {
        String token = login(registrarEConfirmar("Engenharia de Software"));

        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("nome", "Aluno Teste", "curso", "Engenharia de Software", "periodo", 4,
                        "interesses", List.of("IA", "Robótica", "Segurança da Informação")))
                .when().put("/perfil/me")
                .then().statusCode(200)
                .body("interesses", hasSize(3))
                .body("interesses[0]", equalTo("IA"))
                .body("interesses[2]", equalTo("Segurança da Informação"));

        given().header("Authorization", "Bearer " + token)
                .when().get("/perfil/me")
                .then().statusCode(200)
                .body("periodo", equalTo(4))
                .body("interesses", hasSize(3))
                .body("interesses[0]", equalTo("IA"))
                .body("interesses[2]", equalTo("Segurança da Informação"));
    }

    @Test
    void salvarDeNovoSubstituiOsInteressesEmVezDeAcumular() {
        String token = login(registrarEConfirmar("Direito"));

        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("nome", "Aluno Teste", "curso", "Direito", "periodo", 1,
                        "interesses", List.of("Primeira")))
                .when().put("/perfil/me").then().statusCode(200);

        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("nome", "Aluno Teste", "curso", "Direito", "periodo", 2,
                        "interesses", List.of("Segunda")))
                .when().put("/perfil/me")
                .then().statusCode(200)
                .body("interesses", hasSize(1))
                .body("interesses[0]", equalTo("Segunda"));
    }

    /** Registra um aluno novo e confirma o e-mail direto no banco (sem depender do link enviado por e-mail). */
    private String registrarEConfirmar(String curso) {
        String email = "perfil.fluxo." + System.nanoTime() + "@catolicasc.edu.br";
        given().contentType(JSON)
                .body(Map.of("nome", "Aluno Teste", "email", email, "senha", "Senha123!", "curso", curso,
                        "dataNascimento", "2000-01-01"))
                .when().post("/auth/registro")
                .then().statusCode(201);

        QuarkusTransaction.run(() -> usuarioRepository.buscarPorEmail(email)
                .ifPresent(usuario -> usuario.emailConfirmado = true));
        return email;
    }

    private static String login(String email) {
        return given().contentType(JSON)
                .body(Map.of("email", email, "senha", "Senha123!"))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }
}
