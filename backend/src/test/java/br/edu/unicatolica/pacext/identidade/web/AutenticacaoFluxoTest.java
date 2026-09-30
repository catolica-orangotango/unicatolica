package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;

import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova end-to-end (Defeito D1) de que o fluxo login -> acesso autenticado -> logout ->
 * acesso rejeitado funciona sobre o pipeline HTTP/JAX-RS real, coisa que nenhum outro
 * teste do módulo cobre — os demais instanciam recursos/filtro diretamente com mocks e
 * nunca disparam a chamada bloqueante ao banco que {@link
 * br.edu.unicatolica.pacext.compartilhado.seguranca.JwtSecurityFilter} faz na thread de
 * I/O do Vert.x.
 *
 * <p>Antes do fix, esta suíte falha já no segundo passo ({@code GET /usuarios/me} logo
 * após o login) com 401 — não só no passo pós-logout — porque toda requisição autenticada
 * dispara {@code BlockingOperationNotAllowedException} dentro do filtro, engolida
 * silenciosamente e disfarçada de token inválido.</p>
 *
 * <p>Usa um usuário próprio, não o {@code aluno.teste} do seed: o logout invalida a sessão
 * do usuário, e um token emitido no mesmo segundo do logout é tratado como anterior a ele
 * ({@code SessaoInvalidadaFilter}) — com o usuário compartilhado, outra suíte que logasse
 * nesse segundo recebia 401.</p>
 */
@QuarkusTest
class AutenticacaoFluxoTest {

    private static final String SENHA = "Senha123!";

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    PasswordHasher passwordHasher;

    private String email;

    @BeforeEach
    void criaUsuarioConfirmado() {
        email = "logout." + System.nanoTime() + "@catolicasc.edu.br";
        QuarkusTransaction.requiringNew().run(() -> {
            Usuario usuario = new Usuario();
            usuario.nome = "Aluno Logout";
            usuario.email = email;
            usuario.senhaHash = passwordHasher.gerarHash(SENHA);
            usuario.perfil = "ALUNO";
            usuario.emailConfirmado = true;
            usuario.criadoEm = Instant.now();
            usuarioRepository.persist(usuario);
        });
    }

    @Test
    void loginDaAcessoELogoutInvalidaSessao() {
        String token = given().contentType(JSON)
                .body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");

        given().header("Authorization", "Bearer " + token)
                .when().get("/usuarios/me")
                .then().statusCode(200);

        given().header("Authorization", "Bearer " + token)
                .when().post("/auth/logout")
                .then().statusCode(204);

        given().header("Authorization", "Bearer " + token)
                .when().get("/usuarios/me")
                .then().statusCode(401);
    }
}
