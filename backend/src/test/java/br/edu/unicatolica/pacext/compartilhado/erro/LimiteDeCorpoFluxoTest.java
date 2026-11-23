package br.edu.unicatolica.pacext.compartilhado.erro;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import io.restassured.config.HttpClientConfig;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

/**
 * Corpo acima de {@code quarkus.http.limits.max-body-size} responde no envelope (AD-5), não no
 * 413 vazio do Quarkus. O caso multipart está em {@code ArquivoResourceTest}. Com
 * {@code Expect: 100-continue} o cliente lê a resposta sem chegar a mandar o corpo.
 */
@QuarkusTest
class LimiteDeCorpoFluxoTest {

    @Test
    void jsonAcimaDoLimiteDa400CorpoMuitoGrande() {
        byte[] json = new byte[7 * 1024 * 1024];
        Arrays.fill(json, (byte) ' ');

        given().config(RestAssured.config().httpClient(
                        HttpClientConfig.httpClientConfig().setParam("http.protocol.expect-continue", true)))
                .contentType("application/json")
                .body(json)
                .when().post("/auth/login")
                .then().statusCode(400)
                .body("error.code", equalTo("CORPO_MUITO_GRANDE"));
    }
}
