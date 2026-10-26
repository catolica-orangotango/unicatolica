package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste.Sessao;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * {@code /cursos} e {@code GET /admin/cursos} pelo HTTP real: a lista pública do cadastro e a
 * administração de cursos (KAN-44) com 201/200, 401, 403, 409 e 422 do {@code openapi.yaml}.
 *
 * <p>Os testes compartilham o banco: cada um cadastra cursos com nome único e só confere o que
 * ele mesmo criou.</p>
 */
@QuarkusTest
class CursoResourceTest {

    private static final long INEXISTENTE = 999_999L;

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    private Sessao admin;
    private String nome;

    @BeforeEach
    void criaAdministrador() {
        admin = usuarioDeTeste.comPerfil("ADMINISTRADOR");
        nome = "Curso Teste " + UUID.randomUUID();
    }

    // ---- lista pública ----

    @Test
    void listaOsCursosDoSeedSemTokenEmOrdemAlfabetica() {
        given().when().get("/cursos")
                .then().statusCode(200)
                .body("nome", hasItems("Administração", "Engenharia de Software"))
                .body("[0].id", notNullValue());
    }

    // ---- 401 ----

    @Test
    void escritaEListagemDeAdminSemTokenDa401() {
        given().contentType(JSON).body(Map.of("nome", "Curso novo"))
                .when().post("/cursos")
                .then().statusCode(401)
                .body("error.code", equalTo("NAO_AUTENTICADO"));

        given().contentType(JSON).body(Map.of("nome", "Curso novo", "ativo", true))
                .when().put("/cursos/1")
                .then().statusCode(401)
                .body("error.code", equalTo("NAO_AUTENTICADO"));

        given().when().get("/admin/cursos")
                .then().statusCode(401)
                .body("error.code", equalTo("NAO_AUTENTICADO"));
    }

    // ---- 403 ----

    @Test
    void alunoEModeradorNaoAdministramCursos() {
        Sessao aluno = usuarioDeTeste.novo("Administração");
        Sessao moderador = usuarioDeTeste.comPerfil("MODERADOR");

        for (Sessao sessao : new Sessao[] {aluno, moderador}) {
            sessao.autenticado().contentType(JSON).body(Map.of("nome", nome))
                    .when().post("/cursos")
                    .then().statusCode(403)
                    .body("error.code", equalTo("ACESSO_NEGADO"));

            sessao.autenticado().contentType(JSON).body(Map.of("nome", nome, "ativo", true))
                    .when().put("/cursos/1")
                    .then().statusCode(403)
                    .body("error.code", equalTo("ACESSO_NEGADO"));

            sessao.autenticado().when().get("/admin/cursos")
                    .then().statusCode(403)
                    .body("error.code", equalTo("ACESSO_NEGADO"));
        }

        given().when().get("/cursos").then().body("nome", not(hasItem(nome)));
    }

    // ---- POST /cursos ----

    @Test
    void administradorCadastraCursoAtivoQueApareceNasDuasListas() {
        Integer id = admin.autenticado().contentType(JSON).body(Map.of("nome", "  " + nome + "  "))
                .when().post("/cursos")
                .then().statusCode(201)
                .body("id", notNullValue())
                .body("nome", equalTo(nome))
                .body("ativo", equalTo(true))
                .extract().path("id");

        given().when().get("/cursos")
                .then().statusCode(200)
                .body("id", hasItem(id))
                .body("nome", hasItem(nome));

        admin.autenticado().when().get("/admin/cursos")
                .then().statusCode(200)
                .body("nome", hasItem(nome));
    }

    @Test
    void nomeJaUsadoDa409MesmoComOutraCaixa() {
        cadastrar(nome);

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome.toUpperCase()))
                .when().post("/cursos")
                .then().statusCode(409)
                .body("error.code", equalTo("CURSO_NOME_EM_USO"));
    }

    @Test
    void nomeEmBrancoOuAusenteDa422() {
        admin.autenticado().contentType(JSON).body(Map.of("nome", "   "))
                .when().post("/cursos")
                .then().statusCode(422);

        admin.autenticado().contentType(JSON).body(Map.of())
                .when().post("/cursos")
                .then().statusCode(422);
    }

    @Test
    void nomeMuitoLongoDa422() {
        admin.autenticado().contentType(JSON).body(Map.of("nome", "x".repeat(151)))
                .when().post("/cursos")
                .then().statusCode(422)
                .body("error.code", equalTo("NOME_MUITO_LONGO"));
    }

    // ---- PUT /cursos/{id} ----

    @Test
    void administradorRenomeiaCurso() {
        Integer id = cadastrar(nome);

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome + " 2", "ativo", true))
                .when().put("/cursos/{id}", id)
                .then().statusCode(200)
                .body("id", equalTo(id))
                .body("nome", equalTo(nome + " 2"))
                .body("ativo", equalTo(true));

        given().when().get("/cursos").then().body("nome", hasItem(nome + " 2")).body("nome", not(hasItem(nome)));
    }

    @Test
    void cursoDesativadoSomeDaListaPublicaMasContinuaParaOAdministrador() {
        Integer id = cadastrar(nome);

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome, "ativo", false))
                .when().put("/cursos/{id}", id)
                .then().statusCode(200)
                .body("ativo", equalTo(false));

        given().when().get("/cursos").then().body("id", not(hasItem(id)));
        admin.autenticado().when().get("/admin/cursos")
                .then().body("find { it.id == " + id + " }.ativo", equalTo(false));

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome, "ativo", true))
                .when().put("/cursos/{id}", id)
                .then().statusCode(200)
                .body("ativo", equalTo(true));

        given().when().get("/cursos").then().body("id", hasItem(id));
    }

    @Test
    void atualizarCursoInexistenteDa404() {
        admin.autenticado().contentType(JSON).body(Map.of("nome", nome, "ativo", true))
                .when().put("/cursos/{id}", INEXISTENTE)
                .then().statusCode(404)
                .body("error.code", equalTo("CURSO_NAO_ENCONTRADO"));
    }

    @Test
    void renomearParaNomeDeOutroCursoDa409() {
        cadastrar(nome);
        Integer segundo = cadastrar(nome + " B");

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome.toUpperCase(), "ativo", true))
                .when().put("/cursos/{id}", segundo)
                .then().statusCode(409)
                .body("error.code", equalTo("CURSO_NOME_EM_USO"));
    }

    @Test
    void atualizarComCorpoInvalidoDa422() {
        Integer id = cadastrar(nome);

        admin.autenticado().contentType(JSON).body(Map.of("nome", "   ", "ativo", true))
                .when().put("/cursos/{id}", id)
                .then().statusCode(422);

        admin.autenticado().contentType(JSON).body(Map.of("nome", nome))
                .when().put("/cursos/{id}", id)
                .then().statusCode(422);
    }

    private Integer cadastrar(String nomeDoCurso) {
        return admin.autenticado().contentType(JSON).body(Map.of("nome", nomeDoCurso))
                .when().post("/cursos")
                .then().statusCode(201)
                .extract().path("id");
    }
}
