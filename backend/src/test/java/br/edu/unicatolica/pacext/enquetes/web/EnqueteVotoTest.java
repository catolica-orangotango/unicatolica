package br.edu.unicatolica.pacext.enquetes.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;

import br.edu.unicatolica.pacext.enquetes.dominio.Enquete;
import br.edu.unicatolica.pacext.enquetes.dominio.EnqueteRepository;
import br.edu.unicatolica.pacext.enquetes.dominio.SituacaoEnquete;
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
 * Prova pelo HTTP real o contrato de {@code POST /enquetes/{id}/votos} (Story 8.3): caminho feliz, 401
 * e cada código de erro do {@code openapi.yaml}, além do "já votei" na listagem.
 */
@QuarkusTest
class EnqueteVotoTest {

    private static final String SENHA = "Senha123!";

    @Inject
    EnqueteRepository enqueteRepository;

    @Inject
    EntityManager entityManager;

    private String tokenMembro;
    private String tokenOutro;
    private Integer comunidadeId;

    private static String login(String email) {
        return given().contentType(JSON).body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login").then().statusCode(200).extract().path("token");
    }

    private static RequestSpecification como(String token) {
        return given().header("Authorization", "Bearer " + token).contentType(JSON);
    }

    @BeforeEach
    void criaComunidadeDoMembro() {
        tokenMembro = login("aluno.teste@catolicasc.edu.br");
        // Quem cria a comunidade aberta vira membro dela; o moderador de teste não é membro dela.
        tokenOutro = login("moderador.teste@catolicasc.edu.br");
        comunidadeId = como(tokenMembro).body(Map.of("nome", "Votos " + UUID.randomUUID()))
                .when().post("/comunidades").then().statusCode(201).extract().path("id");
    }

    private Integer criarEnquete(String tipo, Integer limite) {
        Map<String, Object> corpo = limite == null
                ? Map.of("pergunta", "Melhor dia?", "tipo", tipo, "opcoes", List.of("Segunda", "Terça", "Quarta"))
                : Map.of("pergunta", "Melhor dia?", "tipo", tipo, "limiteSelecao", limite,
                        "opcoes", List.of("Segunda", "Terça", "Quarta"));
        return como(tokenMembro).body(corpo)
                .when().post("/comunidades/{id}/enquetes", comunidadeId).then().statusCode(201)
                .body("jaVotei", equalTo(false))
                .extract().path("id");
    }

    private List<Integer> opcoesDe(Integer enqueteId) {
        return como(tokenMembro).when().get("/comunidades/{id}/enquetes", comunidadeId)
                .then().statusCode(200)
                .extract().path("content.find { it.id == " + enqueteId + " }.opcoes.id");
    }

    private long votosNaOpcao(Integer opcaoId) {
        return ((Number) entityManager.createNativeQuery("select count(*) from enquete_voto where opcao_id = :o")
                .setParameter("o", opcaoId).getSingleResult()).longValue();
    }

    @Test
    void membroVotaERecebeNoContent_eAListagemPassaADizerQueJaVotou() {
        Integer enquete = criarEnquete("UNICA", null);
        List<Integer> opcoes = opcoesDe(enquete);

        como(tokenMembro).body(Map.of("opcaoIds", List.of(opcoes.get(1))))
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(204);

        como(tokenMembro).when().get("/comunidades/{id}/enquetes", comunidadeId)
                .then().statusCode(200)
                .body("content.find { it.id == " + enquete + " }.jaVotei", equalTo(true));
        QuarkusTransaction.requiringNew().run(() -> org.junit.jupiter.api.Assertions.assertEquals(1, votosNaOpcao(opcoes.get(1))));
    }

    @Test
    void jaVoteiEPorUsuario_outroMembroAindaNaoVotou() {
        Integer enquete = criarEnquete("UNICA", null);
        como(tokenMembro).body(Map.of("opcaoIds", List.of(opcoesDe(enquete).get(0))))
                .when().post("/enquetes/{id}/votos", enquete).then().statusCode(204);

        // O moderador entra na comunidade e vê a mesma enquete como "não votei".
        como(tokenOutro).when().post("/comunidades/{id}/membros", comunidadeId).then().statusCode(org.hamcrest.Matchers.anyOf(equalTo(200), equalTo(201), equalTo(204)));
        como(tokenOutro).when().get("/comunidades/{id}/enquetes", comunidadeId)
                .then().statusCode(200)
                .body("content.find { it.id == " + enquete + " }.jaVotei", equalTo(false));
    }

    @Test
    void segundoVotoDoMesmoUsuarioDa409() {
        Integer enquete = criarEnquete("UNICA", null);
        List<Integer> opcoes = opcoesDe(enquete);
        como(tokenMembro).body(Map.of("opcaoIds", List.of(opcoes.get(0))))
                .when().post("/enquetes/{id}/votos", enquete).then().statusCode(204);

        como(tokenMembro).body(Map.of("opcaoIds", List.of(opcoes.get(1))))
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(409).body("error.code", equalTo("JA_VOTOU"));
    }

    @Test
    void escolhaUnicaComDuasOpcoesDa422() {
        Integer enquete = criarEnquete("UNICA", null);
        List<Integer> opcoes = opcoesDe(enquete);

        como(tokenMembro).body(Map.of("opcaoIds", List.of(opcoes.get(0), opcoes.get(1))))
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(422).body("error.code", equalTo("SELECAO_MULTIPLA_NAO_PERMITIDA"));
    }

    @Test
    void escolhaMultiplaAteOLimiteValeEAcimaDa422() {
        Integer enquete = criarEnquete("MULTIPLA", 2);
        List<Integer> opcoes = opcoesDe(enquete);

        como(tokenMembro).body(Map.of("opcaoIds", opcoes))
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(422).body("error.code", equalTo("LIMITE_SELECAO_EXCEDIDO"));

        como(tokenMembro).body(Map.of("opcaoIds", List.of(opcoes.get(0), opcoes.get(2))))
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(204);
    }

    @Test
    void opcaoDeOutraEnqueteOuSemOpcaoDa422() {
        Integer enquete = criarEnquete("UNICA", null);
        Integer outraEnquete = criarEnquete("UNICA", null);
        Integer opcaoDeOutra = opcoesDe(outraEnquete).get(0);

        como(tokenMembro).body(Map.of("opcaoIds", List.of(opcaoDeOutra)))
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(422).body("error.code", equalTo("OPCAO_INVALIDA"));

        como(tokenMembro).body(Map.of("opcaoIds", List.of()))
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(422).body("error.code", equalTo("OPCAO_INVALIDA"));

        como(tokenMembro).body(Map.of())
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(422).body("error.code", equalTo("OPCAO_INVALIDA"));
    }

    @Test
    void naoMembroDa403() {
        Integer enquete = criarEnquete("UNICA", null);

        como(tokenOutro).body(Map.of("opcaoIds", List.of(opcoesDe(enquete).get(0))))
                .when().post("/enquetes/{id}/votos", enquete)
                .then().statusCode(403).body("error.code", equalTo("NAO_E_MEMBRO"));
    }

    @Test
    void enqueteInexistenteDa404() {
        como(tokenMembro).body(Map.of("opcaoIds", List.of(1)))
                .when().post("/enquetes/{id}/votos", 999_999)
                .then().statusCode(404).body("error.code", equalTo("ENQUETE_NAO_ENCONTRADA"));
    }

    @Test
    void semTokenDa401() {
        given().contentType(JSON).body(Map.of("opcaoIds", List.of(1)))
                .when().post("/enquetes/{id}/votos", 1)
                .then().statusCode(401).body("error.code", notNullValue());
    }

    @Test
    void enqueteEncerradaOuOcultadaNaoAceitaVoto() {
        for (SituacaoEnquete situacao : List.of(SituacaoEnquete.ENCERRADA, SituacaoEnquete.OCULTA)) {
            Integer enquete = criarEnquete("UNICA", null);
            List<Integer> opcoes = opcoesDe(enquete);
            QuarkusTransaction.requiringNew().run(() -> {
                Enquete e = enqueteRepository.findById(enquete.longValue());
                e.situacao = situacao;
            });

            como(tokenMembro).body(Map.of("opcaoIds", List.of(opcoes.get(0))))
                    .when().post("/enquetes/{id}/votos", enquete)
                    .then().statusCode(409).body("error.code", equalTo("ENQUETE_NAO_ACEITA_VOTOS"));
        }
    }

    @Test
    void minhasAtivasTrazOJaVotei() {
        Integer enquete = criarEnquete("UNICA", null);
        como(tokenMembro).body(Map.of("opcaoIds", List.of(opcoesDe(enquete).get(0))))
                .when().post("/enquetes/{id}/votos", enquete).then().statusCode(204);

        como(tokenMembro).queryParam("tamanho", 100).when().get("/enquetes/minhas")
                .then().statusCode(200)
                .body("content.find { it.id == " + enquete + " }.jaVotei", equalTo(true))
                .body("content.id", hasItem(enquete))
                .body("content", org.hamcrest.Matchers.not(hasSize(0)));
    }
}
