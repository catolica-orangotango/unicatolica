package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/** {@code GET /cursos} pelo HTTP real: público, só ativos, em ordem alfabética. */
@QuarkusTest
class CursoResourceTest {

    @Test
    void listaOs26CursosDoSeedSemToken() {
        given().when().get("/cursos")
                .then().statusCode(200)
                .body("$", hasSize(26))
                .body("[0].nome", equalTo("Administração"))
                .body("nome", hasItem("Engenharia de Software"))
                .body("[0].id", org.hamcrest.Matchers.notNullValue());
    }

    @Test
    void escritaEmCursosSemTokenDa401() {
        given().contentType("application/json").body("{\"nome\":\"Curso novo\"}")
                .when().post("/cursos")
                .then().statusCode(401)
                .body("error.code", equalTo("NAO_AUTENTICADO"));
    }
}
