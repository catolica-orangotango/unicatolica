package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.test.junit.QuarkusTest;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Prova com o seed real: o administrador de teste entra com login de verdade, o token traz
 * {@code roles = [ADMINISTRADOR]} e abre a rota de admin e a fila de moderação. O seed é só do
 * contexto {@code dev} ({@code application.properties} define {@code dev} como padrão e
 * {@code %prod} como {@code prod}), então não existe em produção.
 */
@QuarkusTest
class AdminSeedFluxoTest {

    private static final String EMAIL = "admin.teste@catolicasc.edu.br";
    private static final String SENHA = "Senha123!";

    @Test
    void adminDeTesteLogaComPerfilAdministradorEAbreAsRotas() {
        String token = given().contentType(JSON).body(Map.of("email", EMAIL, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");

        assertEquals("[\"ADMINISTRADOR\"]", rolesDo(token));

        given().header("Authorization", "Bearer " + token)
                .when().get("/admin/painel")
                .then().statusCode(200).body("perfil", equalTo("ADMINISTRADOR"));
        given().header("Authorization", "Bearer " + token)
                .when().get("/moderacao/denuncias")
                .then().statusCode(200);
    }

    @Test
    void seedDoAdministradorSoRodaNoContextoDev() throws IOException {
        try (InputStream in = getClass().getResourceAsStream(
                "/db/changelog/modulos/identidade/identidade-008-seed-admin-teste.xml")) {
            String xml = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            Matcher changeSet = Pattern.compile("<changeSet[^>]*>").matcher(xml);
            assertTrue(changeSet.find());
            assertTrue(changeSet.group().contains("context=\"dev\""), changeSet.group());
        }
    }

    private static String rolesDo(String token) {
        String payload = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]), StandardCharsets.UTF_8);
        Matcher roles = Pattern.compile("\"roles\":(\\[[^\\]]*\\])").matcher(payload);
        assertTrue(roles.find(), payload);
        return roles.group(1).replace(" ", "");
    }
}
