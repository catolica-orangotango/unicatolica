package br.edu.unicatolica.pacext.publicacoes.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.notNullValue;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real (rest-assured) o contrato de {@code /comunidades/{id}/publicacoes}
 * (Stories 3.1 e 3.2): caminho feliz, 401 e cada código de erro do {@code openapi.yaml}.
 */
@QuarkusTest
class PublicacaoFluxoTest {

    private static final String EMAIL = "aluno.teste@catolicasc.edu.br";
    private static final String SENHA = "Senha123!";
    private static final long COMUNIDADE_INEXISTENTE = 999_999L;

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    private String token;
    private Integer comunidadeMembro;

    @BeforeEach
    void loginECriaComunidadeDaQualSouMembro() {
        token = given().contentType(JSON)
                .body(Map.of("email", EMAIL, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");

        // Quem cria a comunidade aberta vira membro dela (RF23).
        comunidadeMembro = given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("nome", "Publicações " + UUID.randomUUID()))
                .when().post("/comunidades")
                .then().statusCode(201)
                .extract().path("id");
    }

    @Test
    void membroPublicaEAPostagemApareceNoTopoDoFeed() {
        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "primeira"))
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "  segunda  "))
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(201)
                .body("id", notNullValue())
                .body("comunidadeId", equalTo(comunidadeMembro))
                .body("conteudo", equalTo("segunda"))
                .body("autor.nome", equalTo("Aluno Teste"))
                .body("criadoEm", notNullValue());

        given().header("Authorization", "Bearer " + token)
                .queryParam("tamanho", 1)
                .when().get("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(200)
                .body("content.size()", equalTo(1))
                .body("content[0].conteudo", equalTo("segunda"))
                .body("content[0].autor.nome", equalTo("Aluno Teste"))
                .body("page", equalTo(0))
                .body("size", equalTo(1))
                .body("totalElements", equalTo(2))
                .body("totalPages", equalTo(2));
    }

    @Test
    void semTokenDa401() {
        given().contentType(JSON).body(Map.of("conteudo", "oi"))
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(401)
                .body("error.code", notNullValue());

        given().when().get("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(401)
                .body("error.code", notNullValue());
    }

    @Test
    void naoMembroNaoPublicaMasLeOFeed() {
        // Comunidades de curso vêm do seed; o aluno de teste não tem curso, então não é membro de nenhuma.
        Integer comunidadeCurso = given().header("Authorization", "Bearer " + token)
                .queryParam("tipo", "CURSO").queryParam("tamanho", 1)
                .when().get("/comunidades")
                .then().statusCode(200)
                .extract().path("content[0].id");

        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "oi"))
                .when().post("/comunidades/{id}/publicacoes", comunidadeCurso)
                .then().statusCode(403)
                .body("error.code", equalTo("NAO_E_MEMBRO"));

        given().header("Authorization", "Bearer " + token)
                .when().get("/comunidades/{id}/publicacoes", comunidadeCurso)
                .then().statusCode(200);
    }

    @Test
    void comunidadeInexistenteDa404() {
        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "oi"))
                .when().post("/comunidades/{id}/publicacoes", COMUNIDADE_INEXISTENTE)
                .then().statusCode(404)
                .body("error.code", equalTo("COMUNIDADE_NAO_ENCONTRADA"));

        given().header("Authorization", "Bearer " + token)
                .when().get("/comunidades/{id}/publicacoes", COMUNIDADE_INEXISTENTE)
                .then().statusCode(404)
                .body("error.code", equalTo("COMUNIDADE_NAO_ENCONTRADA"));
    }

    @Test
    void conteudoEmBrancoDa422() {
        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "   "))
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(422)
                .body("error.code", equalTo("CAMPO_OBRIGATORIO"))
                .body("error.details", equalTo("conteudo"));
    }

    @Test
    void conteudoAcimaDe5000CaracteresDa422() {
        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "a".repeat(5001)))
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(422)
                .body("error.code", equalTo("CONTEUDO_MUITO_LONGO"));
    }

    @Test
    void postagemComAnexoDevolveAnexoNaCriacaoENoFeed() {
        Integer arquivoId = enviarPng(token);

        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "com anexo", "arquivoId", arquivoId))
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(201)
                .body("anexo.id", equalTo(arquivoId))
                .body("anexo.tipo", equalTo("image/png"))
                .body("anexo.nome", equalTo("anexo.png"))
                .body("anexo.url", not(emptyOrNullString()));

        given().header("Authorization", "Bearer " + token)
                .when().get("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(200)
                .body("content[0].anexo.id", equalTo(arquivoId))
                .body("content[0].anexo.tipo", equalTo("image/png"))
                .body("content[0].anexo.url", not(emptyOrNullString()));
    }

    @Test
    void postagemSemAnexoNaoTemAnexo() {
        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "sem anexo"))
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(201)
                .body("anexo", nullValue());
    }

    @Test
    void arquivoDeOutroUsuarioDa404() {
        Integer arquivoDeOutro = enviarPng(usuarioDeTeste.novo("Administração").token());

        given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("conteudo", "roubando", "arquivoId", arquivoDeOutro))
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(404)
                .body("error.code", equalTo("ARQUIVO_NAO_ENCONTRADO"));
    }

    @Test
    void reutilizarOMesmoArquivoDa409() {
        Integer arquivoId = enviarPng(token);
        Map<String, Object> corpo = Map.of("conteudo", "primeira", "arquivoId", arquivoId);

        given().header("Authorization", "Bearer " + token).contentType(JSON).body(corpo)
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(201);

        given().header("Authorization", "Bearer " + token).contentType(JSON).body(corpo)
                .when().post("/comunidades/{id}/publicacoes", comunidadeMembro)
                .then().statusCode(409)
                .body("error.code", equalTo("ARQUIVO_EM_USO"));
    }

    private static Integer enviarPng(String bearer) {
        byte[] png = Arrays.copyOf(new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, 64);
        return given().header("Authorization", "Bearer " + bearer)
                .contentType(ContentType.MULTIPART)
                .multiPart("finalidade", "ANEXO_POSTAGEM")
                .multiPart("arquivo", "anexo.png", png, "image/png")
                .when().post("/arquivos")
                .then().statusCode(201)
                .extract().path("id");
    }
}
