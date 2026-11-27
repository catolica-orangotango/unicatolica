package br.edu.unicatolica.pacext.avisos.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real o contrato de {@code /admin/avisos} (Story 13.1, RF81): caminho feliz, 401,
 * 403 e cada código de erro do {@code openapi.yaml}.
 */
@QuarkusTest
class AvisoAdminFluxoTest {

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    private UsuarioDeTeste.Sessao admin;

    @BeforeEach
    void loginDoAdministrador() {
        admin = usuarioDeTeste.comPerfil("ADMINISTRADOR");
    }

    private static Map<String, Object> corpo(String titulo, String escopo, Object cursoId) {
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("titulo", titulo);
        corpo.put("mensagem", "Mensagem de " + titulo);
        corpo.put("escopo", escopo);
        corpo.put("cursoId", cursoId);
        return corpo;
    }

    @Test
    void administradorPublicaAvisoGeralEDeCursoEOsVeNaListaMaisRecentePrimeiro() {
        Integer curso = UsuarioDeTeste.idDoCurso("Engenharia de Software");

        admin.autenticado().contentType(JSON).body(corpo("Geral", "GERAL", null))
                .when().post("/admin/avisos")
                .then().statusCode(201)
                .body("id", notNullValue())
                .body("titulo", equalTo("Geral"))
                .body("escopo", equalTo("GERAL"))
                .body("cursoId", nullValue())
                .body("cursoNome", nullValue())
                .body("criadoEm", notNullValue());

        Map<String, Object> deCurso = corpo("Do curso", "CURSO", curso);
        deCurso.put("dataDestaque", "2026-12-07");
        admin.autenticado().contentType(JSON).body(deCurso)
                .when().post("/admin/avisos")
                .then().statusCode(201)
                .body("escopo", equalTo("CURSO"))
                .body("cursoId", equalTo(curso))
                .body("cursoNome", equalTo("Engenharia de Software"))
                .body("dataDestaque", equalTo("2026-12-07"));

        admin.autenticado().queryParam("tamanho", 2)
                .when().get("/admin/avisos")
                .then().statusCode(200)
                .body("content.size()", equalTo(2))
                .body("content[0].titulo", equalTo("Do curso"))
                .body("content[0].cursoNome", equalTo("Engenharia de Software"))
                .body("content[1].titulo", equalTo("Geral"))
                .body("totalElements", greaterThanOrEqualTo(2));
    }

    @Test
    void semTokenDa401() {
        given().contentType(JSON).body(corpo("t", "GERAL", null))
                .when().post("/admin/avisos").then().statusCode(401).body("error.code", notNullValue());
        given().when().get("/admin/avisos").then().statusCode(401).body("error.code", notNullValue());
    }

    @Test
    void moderadorEAlunoNaoPublicamNemListamDa403() {
        UsuarioDeTeste.Sessao moderador = usuarioDeTeste.comPerfil("MODERADOR");
        UsuarioDeTeste.Sessao aluno = usuarioDeTeste.comPerfil("ALUNO");

        for (UsuarioDeTeste.Sessao sessao : new UsuarioDeTeste.Sessao[] {moderador, aluno}) {
            sessao.autenticado().contentType(JSON).body(corpo("t", "GERAL", null))
                    .when().post("/admin/avisos")
                    .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
            sessao.autenticado().when().get("/admin/avisos")
                    .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
        }
    }

    @Test
    void semEscopoDa422() {
        Map<String, Object> semEscopo = corpo("t", null, null);
        admin.autenticado().contentType(JSON).body(semEscopo)
                .when().post("/admin/avisos")
                .then().statusCode(422)
                .body("error.code", equalTo("ESCOPO_OBRIGATORIO"))
                .body("error.details", equalTo("escopo"));
    }

    @Test
    void escopoCursoSemCursoDa422EComCursoInexistenteDa404() {
        admin.autenticado().contentType(JSON).body(corpo("t", "CURSO", null))
                .when().post("/admin/avisos")
                .then().statusCode(422)
                .body("error.code", equalTo("CURSO_OBRIGATORIO"));

        admin.autenticado().contentType(JSON).body(corpo("t", "CURSO", 999_999))
                .when().post("/admin/avisos")
                .then().statusCode(404)
                .body("error.code", equalTo("CURSO_NAO_ENCONTRADO"));
    }

    @Test
    void tituloEmBrancoDa422() {
        admin.autenticado().contentType(JSON).body(corpo("   ", "GERAL", null))
                .when().post("/admin/avisos")
                .then().statusCode(422)
                .body("error.code", equalTo("CAMPO_OBRIGATORIO"))
                .body("error.details", equalTo("titulo"));
    }
}
