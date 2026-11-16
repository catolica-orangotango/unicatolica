package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import br.edu.unicatolica.pacext.compartilhado.auditoria.LogAuditoria;
import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * {@code /admin/auditoria} pelo HTTP real (KAN-90). Cada teste grava logs num módulo próprio
 * ({@code teste-<nanoTime>}) e filtra por ele, para não depender dos logs de outros testes.
 */
@QuarkusTest
class AuditoriaAdminResourceTest {

    private static final String SENHA = "Senha123!";

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    PasswordHasher passwordHasher;

    @Inject
    EntityManager entityManager;

    record Conta(long id, String nome, String email, String token) {
    }

    // ---- listar ----

    @Test
    void administradorVeOsMaisRecentesPrimeiroComAutorEEntidade() {
        Conta admin = nova("ADMINISTRADOR");
        Conta autor = nova("ALUNO");
        String modulo = modulo();
        log(autor.id(), modulo, "PERFIL_ALTERADO", "Usuario", 7L, "ALUNO -> MODERADOR", "2026-03-01T10:00:00Z");
        log(null, modulo, "EVENTO_DO_SISTEMA", null, null, null, "2026-03-01T11:00:00Z");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo)
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("page", equalTo(0))
                .body("size", equalTo(20))
                .body("totalElements", equalTo(2))
                .body("content.acao", contains("EVENTO_DO_SISTEMA", "PERFIL_ALTERADO"))
                .body("content[0].autor", nullValue())
                .body("content[0].entidadeAfetada", nullValue())
                .body("content[1].criadoEm", equalTo("2026-03-01T10:00:00Z"))
                .body("content[1].autor.id", equalTo((int) autor.id()))
                .body("content[1].autor.nome", equalTo(autor.nome()))
                .body("content[1].autor.email", equalTo(autor.email()))
                .body("content[1].modulo", equalTo(modulo))
                .body("content[1].entidadeAfetada", equalTo("Usuario"))
                .body("content[1].entidadeId", equalTo(7))
                .body("content[1].detalhes", equalTo("ALUNO -> MODERADOR"));
    }

    @Test
    void usuarioQueNaoExisteMaisVoltaComIdENomeENulos() {
        Conta admin = nova("ADMINISTRADOR");
        String modulo = modulo();
        log(987_654_321L, modulo, "ACAO", null, null, null, "2026-03-01T10:00:00Z");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo)
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("content[0].autor.id", equalTo(987_654_321))
                .body("content[0].autor.nome", nullValue())
                .body("content[0].autor.email", nullValue());
    }

    @Test
    void filtraPorAcaoEPorEntidadeAfetada() {
        Conta admin = nova("ADMINISTRADOR");
        String modulo = modulo();
        log(null, modulo, "A", "Usuario", 1L, "x", "2026-03-01T10:00:00Z");
        log(null, modulo, "B", "Usuario", 2L, "x", "2026-03-01T10:01:00Z");
        log(null, modulo, "B", "Comunidade", 3L, "x", "2026-03-01T10:02:00Z");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("acao", "B")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("totalElements", equalTo(2))
                .body("content.entidadeId", contains(3, 2));

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("entidadeAfetada", "Usuario")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("content.acao", contains("B", "A"));
    }

    @Test
    void detalhesCasaPorTrechoSemDiferenciarMaiusculasEIgnoraMenosDeTresCaracteres() {
        Conta admin = nova("ADMINISTRADOR");
        String modulo = modulo();
        log(null, modulo, "A", null, null, "ALUNO -> MODERADOR", "2026-03-01T10:00:00Z");
        log(null, modulo, "B", null, null, "ALUNO -> ADMINISTRADOR", "2026-03-01T10:01:00Z");
        log(null, modulo, "C", null, null, "ativo: true -> false", "2026-03-01T10:02:00Z");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("detalhes", "moderador")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("content.acao", contains("A"));

        // 2 caracteres: filtro ignorado, volta tudo do módulo.
        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("detalhes", "MO")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("totalElements", equalTo(3));
    }

    @Test
    void percentualEUnderlineNosDetalhesSaoLiterais() {
        Conta admin = nova("ADMINISTRADOR");
        String modulo = modulo();
        log(null, modulo, "A", null, null, "desconto 50% aplicado", "2026-03-01T10:00:00Z");
        log(null, modulo, "B", null, null, "desconto 500 aplicado", "2026-03-01T10:01:00Z");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("detalhes", "50% ")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("content.acao", contains("A"));
    }

    @Test
    void intervaloDeDatasUsaDiasInclusivosEmBrasilia() {
        Conta admin = nova("ADMINISTRADOR");
        String modulo = modulo();
        // 23:30 de 09/03 em Brasília (02:30Z de 10/03) e 00:30 de 10/03 (03:30Z).
        log(null, modulo, "ANTES_DA_MEIA_NOITE", null, null, null, "2026-03-10T02:30:00Z");
        log(null, modulo, "DEPOIS_DA_MEIA_NOITE", null, null, null, "2026-03-10T03:30:00Z");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("de", "2026-03-09").queryParam("ate", "2026-03-09")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("content.acao", contains("ANTES_DA_MEIA_NOITE"));

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("de", "2026-03-10").queryParam("ate", "2026-03-10")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("content.acao", contains("DEPOIS_DA_MEIA_NOITE"));

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("de", "2026-03-09").queryParam("ate", "2026-03-10")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("totalElements", equalTo(2));
    }

    @Test
    void filtrosSeCombinamComE() {
        Conta admin = nova("ADMINISTRADOR");
        String modulo = modulo();
        log(null, modulo, "A", "Usuario", 1L, "alvo", "2026-03-01T10:00:00Z");
        log(null, modulo, "A", "Comunidade", 2L, "alvo", "2026-03-01T10:01:00Z");
        log(null, modulo, "B", "Usuario", 3L, "alvo", "2026-03-01T10:02:00Z");
        log(null, modulo, "A", "Usuario", 4L, "outro", "2026-03-01T10:03:00Z");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("acao", "A").queryParam("entidadeAfetada", "Usuario")
                .queryParam("detalhes", "alvo").queryParam("de", "2026-03-01").queryParam("ate", "2026-03-01")
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("totalElements", equalTo(1))
                .body("content[0].entidadeId", equalTo(1));
    }

    @Test
    void paginaDeVinteETamanhoAcimaDeVinteVirraVinte() {
        Conta admin = nova("ADMINISTRADOR");
        String modulo = modulo();
        for (int i = 0; i < 25; i++) {
            log(null, modulo, "A", null, (long) i, null, "2026-03-01T10:00:00Z");
        }

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("tamanho", 500)
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("size", equalTo(20))
                .body("content", hasSize(20))
                .body("totalElements", equalTo(25))
                .body("totalPages", equalTo(2));

        // Mesmo instante: desempata por id decrescente, então a página 1 traz os 5 mais antigos.
        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("modulo", modulo).queryParam("pagina", 1)
                .when().get("/admin/auditoria")
                .then().statusCode(200)
                .body("page", equalTo(1))
                .body("content", hasSize(5))
                .body("content.entidadeId", contains(4, 3, 2, 1, 0));
    }

    @Test
    void deDepoisDeAteDa422() {
        Conta admin = nova("ADMINISTRADOR");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("de", "2026-03-10").queryParam("ate", "2026-03-09")
                .when().get("/admin/auditoria")
                .then().statusCode(422)
                .body("error.code", equalTo("INTERVALO_DE_DATAS_INVALIDO"));
    }

    @Test
    void consultarNaoGeraLog() {
        Conta admin = nova("ADMINISTRADOR");
        long antes = totalDeLogs();

        given().header("Authorization", "Bearer " + admin.token()).queryParam("modulo", "identidade")
                .when().get("/admin/auditoria").then().statusCode(200);
        given().header("Authorization", "Bearer " + admin.token())
                .when().get("/admin/auditoria/filtros").then().statusCode(200);

        assertEquals(antes, totalDeLogs());
    }

    // ---- filtros ----

    @Test
    void filtrosDevolvemModulosAcoesPorModuloEEntidades() {
        Conta admin = nova("ADMINISTRADOR");
        String modulo = modulo();
        log(null, modulo, "ZETA", "EntidadeFiltro" + modulo, 1L, null, "2026-03-01T10:00:00Z");
        log(null, modulo, "ALFA", null, null, null, "2026-03-01T10:01:00Z");
        log(null, modulo, "ALFA", null, null, null, "2026-03-01T10:02:00Z");

        given().header("Authorization", "Bearer " + admin.token())
                .when().get("/admin/auditoria/filtros")
                .then().statusCode(200)
                .body("modulos", hasItems(modulo))
                .body("acoesPorModulo['" + modulo + "']", contains("ALFA", "ZETA"))
                .body("entidadesAfetadas", hasItems("EntidadeFiltro" + modulo));
    }

    // ---- 401 e 403 ----

    @Test
    void semTokenAsDuasRotasDao401() {
        given().when().get("/admin/auditoria").then().statusCode(401);
        given().when().get("/admin/auditoria/filtros").then().statusCode(401);
    }

    @Test
    void alunoEModeradorRecebem403NasDuasRotas() {
        for (String perfil : new String[] {"ALUNO", "MODERADOR"}) {
            String bearer = "Bearer " + nova(perfil).token();

            given().header("Authorization", bearer)
                    .when().get("/admin/auditoria")
                    .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
            given().header("Authorization", bearer)
                    .when().get("/admin/auditoria/filtros")
                    .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
        }
    }

    @Test
    void nenhumaRotaAlteraOuApagaLog() {
        Conta admin = nova("ADMINISTRADOR");
        for (String metodo : new String[] {"POST", "PUT", "DELETE", "PATCH"}) {
            given().header("Authorization", "Bearer " + admin.token()).contentType(JSON).body(Map.of())
                    .when().request(metodo, "/admin/auditoria")
                    // Sem handler: o mapper global devolve erro (hoje 500, não 405), nunca 2xx.
                    .then().statusCode(org.hamcrest.Matchers.greaterThanOrEqualTo(400));
        }
    }

    // ---- apoio ----

    private static String modulo() {
        return "teste-" + System.nanoTime();
    }

    private long totalDeLogs() {
        return QuarkusTransaction.requiringNew().call(() ->
                entityManager.createQuery("select count(l) from LogAuditoria l", Long.class).getSingleResult());
    }

    private void log(Long usuarioId, String modulo, String acao, String entidade, Long entidadeId, String detalhes,
            String criadoEm) {
        QuarkusTransaction.requiringNew().run(() -> {
            LogAuditoria log = new LogAuditoria();
            log.usuarioId = usuarioId;
            log.modulo = modulo;
            log.acao = acao;
            log.entidadeAfetada = entidade;
            log.entidadeId = entidadeId;
            log.detalhes = detalhes;
            log.criadoEm = Instant.parse(criadoEm);
            entityManager.persist(log);
        });
    }

    private Conta nova(String perfil) {
        String email = "admin.auditoria." + System.nanoTime() + "@catolicasc.edu.br";
        String nome = "Auditoria " + System.nanoTime();
        Long id = QuarkusTransaction.requiringNew().call(() -> {
            Usuario usuario = new Usuario();
            usuario.nome = nome;
            usuario.email = email;
            usuario.senhaHash = passwordHasher.gerarHash(SENHA);
            usuario.perfil = perfil;
            usuario.emailConfirmado = true;
            usuario.criadoEm = Instant.now();
            usuarioRepository.persist(usuario);
            return usuario.id;
        });
        return new Conta(id, nome, email, login(email));
    }

    private String login(String email) {
        return given().contentType(JSON).body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }
}
