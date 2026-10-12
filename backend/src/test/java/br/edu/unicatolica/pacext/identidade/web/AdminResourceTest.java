package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;

import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** {@code GET /admin/painel} pelo HTTP real: 200, 401 e 403 do {@code openapi.yaml}. */
@QuarkusTest
class AdminResourceTest {

    private static final String SENHA = "Senha123!";

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    PasswordHasher passwordHasher;

    @Test
    void administradorRecebe200ComOPerfil() {
        given().header("Authorization", "Bearer " + login("ADMINISTRADOR"))
                .when().get("/admin/painel")
                .then().statusCode(200)
                .body("perfil", equalTo("ADMINISTRADOR"));
    }

    @Test
    void alunoRecebe403() {
        given().header("Authorization", "Bearer " + login("ALUNO"))
                .when().get("/admin/painel")
                .then().statusCode(403)
                .body("error.code", equalTo("ACESSO_NEGADO"));
    }

    @Test
    void moderadorRecebe403() {
        given().header("Authorization", "Bearer " + login("MODERADOR"))
                .when().get("/admin/painel")
                .then().statusCode(403)
                .body("error.code", equalTo("ACESSO_NEGADO"));
    }

    @Test
    void semTokenRecebe401() {
        given().when().get("/admin/painel")
                .then().statusCode(401)
                .body("error.code", notNullValue());
    }

    private String login(String perfil) {
        String email = "admin.resource." + System.nanoTime() + "@catolicasc.edu.br";
        QuarkusTransaction.requiringNew().run(() -> {
            Usuario usuario = new Usuario();
            usuario.nome = "Usuário " + perfil;
            usuario.email = email;
            usuario.senhaHash = passwordHasher.gerarHash(SENHA);
            usuario.perfil = perfil;
            usuario.emailConfirmado = true;
            usuario.criadoEm = Instant.now();
            usuarioRepository.persist(usuario);
        });
        return given().contentType(JSON).body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }
}
