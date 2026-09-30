package br.edu.unicatolica.pacext.perfil.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real o contrato do Perfil (Stories 4.1, 4.2 e 4.4): caminho feliz,
 * auto-join na troca de curso, 401, 404 e cada 422 do {@code openapi.yaml}. Usa um usuário
 * próprio por teste: o PUT muda nome e curso, e o {@code aluno.teste} do seed é usado por
 * outras suítes.
 */
@QuarkusTest
class PerfilFluxoTest {

    private static final String SENHA = "Senha123!";

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    PasswordHasher passwordHasher;

    private Long usuarioId;
    private String token;

    @BeforeEach
    void criaUsuarioELoga() {
        String email = "perfil." + System.nanoTime() + "@catolicasc.edu.br";
        usuarioId = QuarkusTransaction.requiringNew().call(() -> {
            Usuario usuario = new Usuario();
            usuario.nome = "Aluno Perfil";
            usuario.email = email;
            usuario.senhaHash = passwordHasher.gerarHash(SENHA);
            usuario.perfil = "ALUNO";
            usuario.emailConfirmado = true;
            usuario.criadoEm = Instant.now();
            usuarioRepository.persist(usuario);
            return usuario.id;
        });
        token = given().contentType(JSON).body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }

    @Test
    void semPerfilAcademicoDevolvePeriodoNuloEInteressesVazio() {
        autenticado().when().get("/perfil/me")
                .then().statusCode(200)
                .body("usuarioId", equalTo(usuarioId.intValue()))
                .body("nome", equalTo("Aluno Perfil"))
                .body("curso", nullValue())
                .body("periodo", nullValue())
                .body("interesses.size()", equalTo(0));
    }

    @Test
    void criaEditaEOutroUsuarioVeSemEmail() {
        Integer engenharia = idDoCurso("Engenharia de Software");

        autenticado().contentType(JSON)
                .body(Map.of("nome", " Ana Lima ", "cursoId", engenharia, "periodo", 3,
                        "interesses", List.of(" Java ", "java", "Robótica")))
                .when().put("/perfil/me")
                .then().statusCode(200)
                .body("nome", equalTo("Ana Lima"))
                .body("curso.id", equalTo(engenharia))
                .body("curso.nome", equalTo("Engenharia de Software"))
                .body("periodo", equalTo(3))
                .body("interesses", equalTo(List.of("Java", "Robótica")));

        autenticado().when().get("/perfil/me")
                .then().statusCode(200)
                .body("periodo", equalTo(3))
                .body("interesses", equalTo(List.of("Java", "Robótica")));

        // Story 4.4: outro usuário (o do seed) vê os mesmos campos, sem e-mail (RF20.2).
        given().header("Authorization", "Bearer " + tokenDoSeed())
                .when().get("/usuarios/{id}/perfil", usuarioId)
                .then().statusCode(200)
                .body("nome", equalTo("Ana Lima"))
                .body("curso.nome", equalTo("Engenharia de Software"))
                .body("interesses", equalTo(List.of("Java", "Robótica")))
                .body("email", nullValue());
    }

    @Test
    void trocarOCursoTrocaAComunidadeDeCurso() {
        salvar(idDoCurso("Engenharia de Software"));
        autenticado().when().get("/comunidades/minhas")
                .then().statusCode(200)
                .body("nome", hasItem("Engenharia de Software"));

        salvar(idDoCurso("Direito"));
        autenticado().when().get("/comunidades/minhas")
                .then().statusCode(200)
                .body("nome", hasItem("Direito"))
                .body("nome", not(hasItem("Engenharia de Software")));
    }

    @Test
    void semTokenDa401() {
        given().when().get("/perfil/me").then().statusCode(401);
        given().contentType(JSON).body(Map.of("nome", "x")).when().put("/perfil/me").then().statusCode(401);
        given().when().get("/usuarios/{id}/perfil", usuarioId).then().statusCode(401);
    }

    @Test
    void perfilDeUsuarioInexistenteDa404() {
        autenticado().when().get("/usuarios/{id}/perfil", 999_999)
                .then().statusCode(404)
                .body("error.code", equalTo("USUARIO_NAO_ENCONTRADO"));
    }

    @Test
    void cadaValidacaoDoContratoDa422() {
        Integer curso = idDoCurso("Direito");
        assertCodigo422(Map.of("nome", " ", "cursoId", curso, "periodo", 3, "interesses", List.of()),
                "CAMPO_OBRIGATORIO");
        assertCodigo422(Map.of("nome", "Ana", "cursoId", 999_999, "periodo", 3, "interesses", List.of()),
                "CURSO_INVALIDO");
        assertCodigo422(Map.of("nome", "Ana", "cursoId", curso, "periodo", 13, "interesses", List.of()),
                "PERIODO_INVALIDO");
        assertCodigo422(Map.of("nome", "Ana", "cursoId", curso, "periodo", 3,
                "interesses", IntStream.rangeClosed(1, 11).mapToObj(i -> "Tema " + i).toList()), "INTERESSES_DEMAIS");
        assertCodigo422(Map.of("nome", "Ana", "cursoId", curso, "periodo", 3,
                "interesses", List.of("a".repeat(51))), "INTERESSE_INVALIDO");

        // Nenhuma tentativa inválida criou o perfil.
        autenticado().when().get("/perfil/me").then().body("periodo", nullValue());
    }

    private void salvar(Integer cursoId) {
        autenticado().contentType(JSON)
                .body(Map.of("nome", "Ana Lima", "cursoId", cursoId, "periodo", 1, "interesses", List.of()))
                .when().put("/perfil/me")
                .then().statusCode(200);
    }

    private void assertCodigo422(Map<String, Object> corpo, String codigo) {
        autenticado().contentType(JSON).body(corpo)
                .when().put("/perfil/me")
                .then().statusCode(422)
                .body("error.code", equalTo(codigo));
    }

    private io.restassured.specification.RequestSpecification autenticado() {
        return given().header("Authorization", "Bearer " + token);
    }

    private static Integer idDoCurso(String nome) {
        return given().when().get("/cursos")
                .then().statusCode(200)
                .extract().path("find { it.nome == '" + nome + "' }.id");
    }

    private static String tokenDoSeed() {
        return given().contentType(JSON)
                .body(Map.of("email", "aluno.teste@catolicasc.edu.br", "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }
}
