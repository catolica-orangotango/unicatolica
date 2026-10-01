package br.edu.unicatolica.pacext.comunidades.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste.Sessao;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.Method;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Prova pelo HTTP real (rest-assured) o contrato de {@code /comunidades} (Stories 2.2, 2.4 e
 * 2.5): caminho feliz, 401 e cada código de erro do {@code openapi.yaml}.
 *
 * <p>Os testes compartilham o banco: cada um cria as próprias comunidades com nome único e
 * só conta o que ele mesmo criou.</p>
 */
@QuarkusTest
class ComunidadeFluxoTest {

    private static final String CURSO = "Administração";
    private static final long INEXISTENTE = 999_999L;

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    private Sessao aluno;
    private String prefixo;

    @BeforeEach
    void criaAluno() {
        aluno = usuarioDeTeste.novo(CURSO);
        prefixo = "Comunidade " + UUID.randomUUID();
    }

    static Stream<Rota> rotas() {
        return Stream.of(
                new Rota(Method.POST, "/comunidades"),
                new Rota(Method.GET, "/comunidades"),
                new Rota(Method.GET, "/comunidades/minhas"),
                new Rota(Method.GET, "/comunidades/1"),
                new Rota(Method.POST, "/comunidades/1/membros"),
                new Rota(Method.DELETE, "/comunidades/1/membros/me"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("rotas")
    void semTokenDa401(Rota rota) {
        given().contentType(JSON).body(Map.of("nome", prefixo))
                .when().request(rota.metodo(), rota.caminho())
                .then().statusCode(401)
                .body("error.code", notNullValue());
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("rotas")
    void tokenMalformadoDa401(Rota rota) {
        given().header("Authorization", "Bearer nao-e-um-jwt").contentType(JSON).body(Map.of("nome", prefixo))
                .when().request(rota.metodo(), rota.caminho())
                .then().statusCode(401)
                .body("error.code", notNullValue());
    }

    @Test
    void criaComunidadeAbertaEOCriadorViraMembro() {
        Integer id = aluno.autenticado().contentType(JSON)
                .body(Map.of("nome", "  " + prefixo + "  ", "descricao", "Grupo de estudos"))
                .when().post("/comunidades")
                .then().statusCode(201)
                .body("id", notNullValue())
                .body("nome", equalTo(prefixo))
                .body("descricao", equalTo("Grupo de estudos"))
                .body("tipo", equalTo("ABERTA"))
                .body("souMembro", equalTo(true))
                .body("criadoEm", notNullValue())
                .extract().path("id");

        aluno.autenticado().when().get("/comunidades/{id}", id)
                .then().statusCode(200)
                .body("id", equalTo(id))
                .body("souMembro", equalTo(true));
    }

    @Test
    void nomeJaUsadoDa409MesmoComOutraCaixa() {
        criar(aluno, prefixo);

        aluno.autenticado().contentType(JSON)
                .body(Map.of("nome", prefixo.toUpperCase()))
                .when().post("/comunidades")
                .then().statusCode(409)
                .body("error.code", equalTo("COMUNIDADE_NOME_EM_USO"));
    }

    @Test
    void nomeEmBrancoDa422() {
        aluno.autenticado().contentType(JSON)
                .body(Map.of("nome", "   "))
                .when().post("/comunidades")
                .then().statusCode(422)
                .body("error.code", equalTo("CAMPO_OBRIGATORIO"));
    }

    @Test
    void listaPaginadaEFiltradaPorNome() {
        Integer a = criar(aluno, prefixo + " A");
        Integer b = criar(aluno, prefixo + " B");
        Integer c = criar(aluno, prefixo + " C");

        aluno.autenticado()
                .queryParam("nome", prefixo.toLowerCase()).queryParam("pagina", 0).queryParam("tamanho", 2)
                .when().get("/comunidades")
                .then().statusCode(200)
                .body("content.id", equalTo(List.of(a, b)))
                .body("page", equalTo(0))
                .body("size", equalTo(2))
                .body("totalElements", equalTo(3))
                .body("totalPages", equalTo(2));

        aluno.autenticado()
                .queryParam("nome", prefixo).queryParam("pagina", 1).queryParam("tamanho", 2)
                .when().get("/comunidades")
                .then().statusCode(200)
                .body("content.id", equalTo(List.of(c)))
                .body("page", equalTo(1));
    }

    @Test
    void filtraPorTipo() {
        criar(aluno, prefixo);

        aluno.autenticado()
                .queryParam("tipo", "ABERTA").queryParam("nome", prefixo)
                .when().get("/comunidades")
                .then().statusCode(200)
                .body("totalElements", equalTo(1));

        aluno.autenticado()
                .queryParam("tipo", "CURSO").queryParam("nome", prefixo)
                .when().get("/comunidades")
                .then().statusCode(200)
                .body("totalElements", equalTo(0));

        aluno.autenticado()
                .queryParam("tipo", "CURSO").queryParam("nome", CURSO)
                .when().get("/comunidades")
                .then().statusCode(200)
                .body("content.nome", hasItem(CURSO))
                .body("content.tipo", everyItem(equalTo("CURSO")));
    }

    @Test
    void tipoInvalidoDa422() {
        aluno.autenticado()
                .queryParam("tipo", "SECRETA")
                .when().get("/comunidades")
                .then().statusCode(422)
                .body("error.code", equalTo("TIPO_INVALIDO"));
    }

    @Test
    void minhasTrazAComunidadeDoCursoEAsCriadas() {
        Integer criada = criar(aluno, prefixo);
        Integer doCurso = comunidadeDoCurso();

        aluno.autenticado().when().get("/comunidades/minhas")
                .then().statusCode(200)
                .body("id", hasItems(doCurso, criada))
                .body("souMembro", everyItem(equalTo(true)));
    }

    @Test
    void detalheParaQuemNaoEMembro() {
        Sessao outro = usuarioDeTeste.novo(CURSO);
        Integer id = criar(outro, prefixo);

        aluno.autenticado().when().get("/comunidades/{id}", id)
                .then().statusCode(200)
                .body("nome", equalTo(prefixo))
                .body("souMembro", equalTo(false));
    }

    @Test
    void comunidadeInexistenteDa404() {
        aluno.autenticado().when().get("/comunidades/{id}", INEXISTENTE)
                .then().statusCode(404)
                .body("error.code", equalTo("COMUNIDADE_NAO_ENCONTRADA"));

        aluno.autenticado().when().post("/comunidades/{id}/membros", INEXISTENTE)
                .then().statusCode(404)
                .body("error.code", equalTo("COMUNIDADE_NAO_ENCONTRADA"));

        aluno.autenticado().when().delete("/comunidades/{id}/membros/me", INEXISTENTE)
                .then().statusCode(404)
                .body("error.code", equalTo("COMUNIDADE_NAO_ENCONTRADA"));
    }

    @Test
    void entraNaComunidadeAbertaEDuasVezesDa409() {
        Integer id = criar(usuarioDeTeste.novo(CURSO), prefixo);

        aluno.autenticado().when().post("/comunidades/{id}/membros", id)
                .then().statusCode(201);

        aluno.autenticado().when().get("/comunidades/minhas")
                .then().body("id", hasItem(id));

        aluno.autenticado().when().post("/comunidades/{id}/membros", id)
                .then().statusCode(409)
                .body("error.code", equalTo("JA_E_MEMBRO"));
    }

    @Test
    void entrarEmComunidadeDeCursoDa403() {
        aluno.autenticado().when().post("/comunidades/{id}/membros", comunidadeDoCurso())
                .then().statusCode(403)
                .body("error.code", equalTo("COMUNIDADE_TIPO_INVALIDO"));
    }

    @Test
    void saiDaComunidadeEElaSomeDeMinhas() {
        Integer id = criar(usuarioDeTeste.novo(CURSO), prefixo);
        aluno.autenticado().when().post("/comunidades/{id}/membros", id)
                .then().statusCode(201);

        aluno.autenticado().when().delete("/comunidades/{id}/membros/me", id)
                .then().statusCode(204);

        aluno.autenticado().when().get("/comunidades/minhas")
                .then().body("id", not(hasItem(id)));

        aluno.autenticado().when().get("/comunidades/{id}", id)
                .then().body("souMembro", equalTo(false));
    }

    private Integer criar(Sessao sessao, String nome) {
        return sessao.autenticado().contentType(JSON)
                .body(Map.of("nome", nome))
                .when().post("/comunidades")
                .then().statusCode(201)
                .extract().path("id");
    }

    private Integer comunidadeDoCurso() {
        return aluno.autenticado()
                .queryParam("tipo", "CURSO").queryParam("nome", CURSO)
                .when().get("/comunidades")
                .then().statusCode(200)
                .extract().path("content.find { it.nome == '" + CURSO + "' }.id");
    }

    record Rota(Method metodo, String caminho) {

        @Override
        public String toString() {
            return metodo + " " + caminho;
        }
    }
}
