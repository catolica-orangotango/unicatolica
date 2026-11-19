package br.edu.unicatolica.pacext.enquetes.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.specification.RequestSpecification;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real o resultado da enquete (Story 8.5): só quem votou vê, só com 5 votos ou mais
 * (RF58.1), e nada que identifique em quem alguém votou.
 */
@QuarkusTest
class EnqueteResultadoTest {

    private static final String SENHA = "Senha123!";

    @Inject
    EntityManager entityManager;

    private String tokenAutor;
    private String tokenOutro;
    private Integer comunidadeId;
    private Integer enqueteId;
    private List<Integer> opcoes;

    private static String login(String email) {
        return given().contentType(JSON).body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login").then().statusCode(200).extract().path("token");
    }

    private static RequestSpecification como(String token) {
        return given().header("Authorization", "Bearer " + token).contentType(JSON);
    }

    @BeforeEach
    void criaEnqueteNaComunidade() {
        tokenAutor = login("aluno.teste@catolicasc.edu.br");
        tokenOutro = login("moderador.teste@catolicasc.edu.br");
        comunidadeId = como(tokenAutor).body(Map.of("nome", "Resultado " + UUID.randomUUID()))
                .when().post("/comunidades").then().statusCode(201).extract().path("id");
        enqueteId = como(tokenAutor)
                .body(Map.of("pergunta", "Melhor dia?", "tipo", "UNICA", "opcoes", List.of("Segunda", "Terça", "Quarta")))
                .when().post("/comunidades/{id}/enquetes", comunidadeId).then().statusCode(201)
                .body("resultado", nullValue())
                .extract().path("id");
        opcoes = como(tokenAutor).when().get("/comunidades/{id}/enquetes", comunidadeId)
                .then().statusCode(200).extract().path("content[0].opcoes.id");
    }

    private RequestSpecification listar(String token) {
        return como(token);
    }

    /** Simula votos de outras pessoas direto no banco: o teste não tem 5 contas, e o voto é só uma linha anônima. */
    private void votosDeOutros(int quantos, int opcaoIndice) {
        QuarkusTransaction.requiringNew().run(() -> {
            for (int i = 0; i < quantos; i++) {
                entityManager.createNativeQuery("insert into enquete_participacao (enquete_id, usuario_id) values (:e, :u)")
                        .setParameter("e", enqueteId).setParameter("u", 9_000_000L + (long) (Math.random() * 1_000_000_000L))
                        .executeUpdate();
                entityManager.createNativeQuery("insert into enquete_voto (opcao_id) values (:o)")
                        .setParameter("o", opcoes.get(opcaoIndice)).executeUpdate();
            }
        });
    }

    @Test
    void quemAindaNaoVotouNaoVeResultadoNemOTotal() {
        votosDeOutros(5, 0);

        listar(tokenAutor).when().get("/comunidades/{id}/enquetes", comunidadeId)
                .then().statusCode(200)
                .body("content[0].jaVotei", equalTo(false))
                .body("content[0].resultado", nullValue());
    }

    @Test
    void votouComMenosDeCincoVe_xDeCincoNecessarios_semContagemPorOpcao() {
        votosDeOutros(2, 0);
        como(tokenAutor).body(Map.of("opcaoIds", List.of(opcoes.get(1))))
                .when().post("/enquetes/{id}/votos", enqueteId).then().statusCode(204);

        listar(tokenAutor).when().get("/comunidades/{id}/enquetes", comunidadeId)
                .then().statusCode(200)
                .body("content[0].resultado.totalVotantes", equalTo(3))
                .body("content[0].resultado.votosNecessarios", equalTo(5))
                .body("content[0].resultado.liberado", equalTo(false))
                .body("content[0].resultado.opcoes", empty());
    }

    @Test
    void votouComCincoOuMaisVeAsBarras() {
        votosDeOutros(4, 0);
        como(tokenAutor).body(Map.of("opcaoIds", List.of(opcoes.get(1))))
                .when().post("/enquetes/{id}/votos", enqueteId).then().statusCode(204);

        listar(tokenAutor).when().get("/comunidades/{id}/enquetes", comunidadeId)
                .then().statusCode(200)
                .body("content[0].resultado.totalVotantes", equalTo(5))
                .body("content[0].resultado.liberado", equalTo(true))
                .body("content[0].resultado.opcoes", hasSize(3))
                .body("content[0].resultado.opcoes.opcaoId", contains(opcoes.get(0), opcoes.get(1), opcoes.get(2)))
                .body("content[0].resultado.opcoes.votos", contains(4, 1, 0));
    }

    @Test
    void minhasEnquetesTambemTrazOResultadoDoQueEleVotou() {
        votosDeOutros(4, 0);
        como(tokenAutor).body(Map.of("opcaoIds", List.of(opcoes.get(2))))
                .when().post("/enquetes/{id}/votos", enqueteId).then().statusCode(204);

        listar(tokenAutor).when().get("/enquetes/minhas")
                .then().statusCode(200)
                .body("content.find { it.id == " + enqueteId + " }.resultado.totalVotantes", equalTo(5));
    }
}
