package br.edu.unicatolica.pacext.enquetes.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import io.quarkus.test.junit.QuarkusTest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real (rest-assured) o contrato de {@code /comunidades/{id}/enquetes} e
 * {@code /enquetes/minhas} (Story 8.1): caminho feliz, 401 e cada código de erro do
 * {@code openapi.yaml}.
 */
@QuarkusTest
class EnqueteFluxoTest {

    private static final String EMAIL = "aluno.teste@catolicasc.edu.br";
    private static final String SENHA = "Senha123!";
    private static final long COMUNIDADE_INEXISTENTE = 999_999L;

    private String token;
    private Integer comunidadeMembro;

    @BeforeEach
    void loginECriaComunidadeDaQualSouMembro() {
        token = given().contentType(JSON)
                .body(Map.of("email", EMAIL, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");

        // Quem cria a comunidade aberta vira membro dela (RF23); uma comunidade nova por teste isola o limite de ativas.
        comunidadeMembro = given().header("Authorization", "Bearer " + token).contentType(JSON)
                .body(Map.of("nome", "Enquetes " + UUID.randomUUID()))
                .when().post("/comunidades")
                .then().statusCode(201)
                .extract().path("id");
    }

    private static Map<String, Object> corpo(String pergunta) {
        return Map.of("pergunta", pergunta, "tipo", "UNICA", "opcoes", List.of("Sim", "Não"));
    }

    private io.restassured.specification.RequestSpecification autenticado() {
        return given().header("Authorization", "Bearer " + token).contentType(JSON);
    }

    @Test
    void membroCriaEnqueteDeEscolhaUnicaEElaApareceNaComunidade() {
        autenticado().body(Map.of("pergunta", "  Melhor dia?  ", "tipo", "UNICA", "limiteSelecao", 3,
                        "opcoes", List.of(" Segunda ", "Terça", "Quarta")))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(201)
                .body("id", notNullValue())
                .body("comunidadeId", equalTo(comunidadeMembro))
                .body("pergunta", equalTo("Melhor dia?"))
                .body("tipo", equalTo("UNICA"))
                .body("limiteSelecao", nullValue())
                .body("situacao", equalTo("ATIVA"))
                .body("autor.nome", equalTo("Aluno Teste"))
                .body("opcoes.texto", contains("Segunda", "Terça", "Quarta"))
                .body("opcoes[0].id", notNullValue())
                .body("criadaEm", notNullValue());

        autenticado().queryParam("tamanho", 10)
                .when().get("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(200)
                .body("content.size()", equalTo(1))
                .body("content[0].pergunta", equalTo("Melhor dia?"))
                .body("content[0].opcoes.texto", contains("Segunda", "Terça", "Quarta"))
                .body("totalElements", equalTo(1));
    }

    @Test
    void membroCriaEnqueteDeEscolhaMultiplaComLimite() {
        autenticado().body(Map.of("pergunta", "Dias?", "tipo", "MULTIPLA", "limiteSelecao", 2,
                        "opcoes", List.of("Segunda", "Terça", "Quarta")))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(201)
                .body("tipo", equalTo("MULTIPLA"))
                .body("limiteSelecao", equalTo(2));
    }

    @Test
    void semTokenDa401() {
        given().contentType(JSON).body(corpo("P?"))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(401).body("error.code", notNullValue());

        given().when().get("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(401).body("error.code", notNullValue());

        given().when().get("/enquetes/minhas")
                .then().statusCode(401).body("error.code", notNullValue());
    }

    @Test
    void naoMembroNaoCriaMasLeAsEnquetes() {
        // Comunidades de curso vêm do seed; o aluno de teste não tem curso, então não é membro de nenhuma.
        Integer comunidadeCurso = autenticado().queryParam("tipo", "CURSO").queryParam("tamanho", 1)
                .when().get("/comunidades")
                .then().statusCode(200)
                .extract().path("content[0].id");

        autenticado().body(corpo("P?"))
                .when().post("/comunidades/{id}/enquetes", comunidadeCurso)
                .then().statusCode(403).body("error.code", equalTo("NAO_E_MEMBRO"));

        autenticado()
                .when().get("/comunidades/{id}/enquetes", comunidadeCurso)
                .then().statusCode(200);
    }

    @Test
    void comunidadeInexistenteDa404() {
        autenticado().body(corpo("P?"))
                .when().post("/comunidades/{id}/enquetes", COMUNIDADE_INEXISTENTE)
                .then().statusCode(404).body("error.code", equalTo("COMUNIDADE_NAO_ENCONTRADA"));

        autenticado()
                .when().get("/comunidades/{id}/enquetes", COMUNIDADE_INEXISTENTE)
                .then().statusCode(404).body("error.code", equalTo("COMUNIDADE_NAO_ENCONTRADA"));
    }

    @Test
    void corpoInvalidoDa422ComOCodigoDoCampo() {
        autenticado().body(Map.of("tipo", "UNICA", "opcoes", List.of("Sim", "Não")))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(422).body("error.code", equalTo("CAMPO_OBRIGATORIO")).body("error.details", equalTo("pergunta"));

        autenticado().body(Map.of("pergunta", "P?", "tipo", "UNICA", "opcoes", List.of("Só uma")))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(422).body("error.code", equalTo("QUANTIDADE_OPCOES_INVALIDA"));

        autenticado().body(Map.of("pergunta", "P?", "tipo", "UNICA", "opcoes", List.of("a", "b", "c", "d", "e", "f")))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(422).body("error.code", equalTo("QUANTIDADE_OPCOES_INVALIDA"));

        autenticado().body(Map.of("pergunta", "P?", "tipo", "UNICA", "opcoes", List.of("Sim", "sim")))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(422).body("error.code", equalTo("OPCAO_DUPLICADA"));

        autenticado().body(Map.of("pergunta", "P?", "tipo", "MULTIPLA", "opcoes", List.of("Sim", "Não")))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(422).body("error.code", equalTo("CAMPO_OBRIGATORIO")).body("error.details", equalTo("limiteSelecao"));

        autenticado().body(Map.of("pergunta", "P?", "tipo", "TRIPLA", "opcoes", List.of("Sim", "Não")))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(422).body("error.code", equalTo("TIPO_INVALIDO"));
    }

    @Test
    void terceiraEnqueteAtivaNaMesmaComunidadeDa409EOutraComunidadeSegueLivre() {
        autenticado().body(corpo("Primeira?")).when().post("/comunidades/{id}/enquetes", comunidadeMembro).then().statusCode(201);
        autenticado().body(corpo("Segunda?")).when().post("/comunidades/{id}/enquetes", comunidadeMembro).then().statusCode(201);

        autenticado().body(corpo("Terceira?"))
                .when().post("/comunidades/{id}/enquetes", comunidadeMembro)
                .then().statusCode(409).body("error.code", equalTo("LIMITE_ENQUETES_ATIVAS"));

        Integer outra = autenticado().body(Map.of("nome", "Outra " + UUID.randomUUID()))
                .when().post("/comunidades").then().statusCode(201).extract().path("id");
        autenticado().body(corpo("Na outra?")).when().post("/comunidades/{id}/enquetes", outra).then().statusCode(201);
    }

    @Test
    void minhasEnquetesAtivasTrazAsDeTodasAsComunidades() {
        autenticado().body(corpo("Aqui?")).when().post("/comunidades/{id}/enquetes", comunidadeMembro).then().statusCode(201);

        autenticado().queryParam("tamanho", 100)
                .when().get("/enquetes/minhas")
                .then().statusCode(200)
                .body("content.comunidadeId", hasItem(comunidadeMembro))
                .body("content.situacao", org.hamcrest.Matchers.everyItem(equalTo("ATIVA")));
    }
}
