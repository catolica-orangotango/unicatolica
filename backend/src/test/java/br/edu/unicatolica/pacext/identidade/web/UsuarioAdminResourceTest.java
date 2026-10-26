package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** {@code /admin/usuarios} pelo HTTP real: caminho feliz, 401, 403, 404, 409 e 422 (KAN-83). */
@QuarkusTest
class UsuarioAdminResourceTest {

    private static final String SENHA = "Senha123!";

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    PasswordHasher passwordHasher;

    record Conta(long id, String email, String nome, String token) {
    }

    // ---- listar ----

    @Test
    void administradorListaComTodosOsCampos() {
        Conta admin = nova("ADMINISTRADOR", "Lista");
        Conta aluno = nova("ALUNO", "Lista");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("busca", aluno.email())
                .when().get("/admin/usuarios")
                .then().statusCode(200)
                .body("page", equalTo(0))
                .body("totalElements", equalTo(1))
                .body("content[0].id", equalTo((int) aluno.id()))
                .body("content[0].nomeCompleto", equalTo(aluno.nome()))
                .body("content[0].email", equalTo(aluno.email()))
                .body("content[0].perfil", equalTo("ALUNO"))
                .body("content[0].ativo", equalTo(true))
                .body("content[0].curso", nullValue());
    }

    @Test
    void buscaPorTrechoDoNomeSemDiferenciarMaiusculas() {
        Conta admin = nova("ADMINISTRADOR", "Busca");
        String marca = "Zeferino" + System.nanoTime();
        nova("ALUNO", marca);
        nova("ALUNO", marca);

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("busca", marca.toUpperCase())
                .when().get("/admin/usuarios")
                .then().statusCode(200)
                .body("totalElements", equalTo(2))
                .body("content.nomeCompleto", everyItem(org.hamcrest.Matchers.containsString(marca)));
    }

    @Test
    void filtraPorPerfilEPagina() {
        Conta admin = nova("ADMINISTRADOR", "Filtro");
        String marca = "Filtro" + System.nanoTime();
        nova("MODERADOR", marca);
        nova("ALUNO", marca);
        nova("ALUNO", marca);

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("busca", marca).queryParam("perfil", "ALUNO")
                .when().get("/admin/usuarios")
                .then().statusCode(200)
                .body("totalElements", equalTo(2))
                .body("content.perfil", everyItem(equalTo("ALUNO")));

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("busca", marca).queryParam("tamanho", 1).queryParam("pagina", 2)
                .when().get("/admin/usuarios")
                .then().statusCode(200)
                .body("totalElements", equalTo(3))
                .body("totalPages", equalTo(3))
                .body("content", hasSize(1));
    }

    @Test
    void perfilDesconhecidoNaListaDa422() {
        Conta admin = nova("ADMINISTRADOR", "Lista422");

        given().header("Authorization", "Bearer " + admin.token())
                .queryParam("perfil", "DONO")
                .when().get("/admin/usuarios")
                .then().statusCode(422)
                .body("error.code", equalTo("PERFIL_INVALIDO"));
    }

    // ---- 401 e 403 ----

    @Test
    void semTokenCadaRotaDa401() {
        given().when().get("/admin/usuarios").then().statusCode(401);
        given().contentType(JSON).body(Map.of("perfil", "ALUNO"))
                .when().put("/admin/usuarios/1/perfil").then().statusCode(401);
        given().contentType(JSON).body(Map.of("ativo", false))
                .when().put("/admin/usuarios/1/ativo").then().statusCode(401);
    }

    @Test
    void alunoEModeradorRecebem403EmCadaRota() {
        Conta alvo = nova("ALUNO", "Alvo403");
        for (String perfil : new String[] {"ALUNO", "MODERADOR"}) {
            String bearer = "Bearer " + nova(perfil, "Quem403").token();

            given().header("Authorization", bearer)
                    .when().get("/admin/usuarios")
                    .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
            given().header("Authorization", bearer).contentType(JSON).body(Map.of("perfil", "MODERADOR"))
                    .when().put("/admin/usuarios/{id}/perfil", alvo.id())
                    .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
            given().header("Authorization", bearer).contentType(JSON).body(Map.of("ativo", false))
                    .when().put("/admin/usuarios/{id}/ativo", alvo.id())
                    .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
        }
        assertPerfilEAtivo(alvo, "ALUNO", true);
    }

    // ---- alterar perfil ----

    @Test
    void alteraOPerfilDerrubaASessaoEOUsuarioEntraComOPerfilNovo() throws InterruptedException {
        Conta admin = nova("ADMINISTRADOR", "Promove");
        Conta aluno = nova("ALUNO", "Promovido");

        given().header("Authorization", "Bearer " + admin.token()).contentType(JSON)
                .body(Map.of("perfil", "MODERADOR"))
                .when().put("/admin/usuarios/{id}/perfil", aluno.id())
                .then().statusCode(200)
                .body("perfil", equalTo("MODERADOR"))
                .body("id", equalTo((int) aluno.id()));

        // Sessão antiga cai na próxima requisição.
        given().header("Authorization", "Bearer " + aluno.token())
                .when().get("/usuarios/me")
                .then().statusCode(401);

        // O token tem precisão de segundo: novo login só vale depois do instante da invalidação.
        Thread.sleep(1100);
        String novoToken = login(aluno.email());
        given().header("Authorization", "Bearer " + novoToken)
                .when().get("/moderacao/denuncias")
                .then().statusCode(200);
    }

    @Test
    void alterarOPerfilFicaNaAuditoria() {
        Conta admin = nova("ADMINISTRADOR", "Audita");
        Conta aluno = nova("ALUNO", "Auditado");

        given().header("Authorization", "Bearer " + admin.token()).contentType(JSON)
                .body(Map.of("perfil", "MODERADOR"))
                .when().put("/admin/usuarios/{id}/perfil", aluno.id())
                .then().statusCode(200);

        Number registros = QuarkusTransaction.requiringNew().call(() -> (Number) usuarioRepository.getEntityManager()
                .createNativeQuery("select count(*) from log_auditoria where acao = 'PERFIL_ALTERADO' "
                        + "and usuario_id = ?1 and entidade_id = ?2 and detalhes = 'ALUNO -> MODERADOR'")
                .setParameter(1, admin.id()).setParameter(2, aluno.id()).getSingleResult());
        org.junit.jupiter.api.Assertions.assertEquals(1, registros.intValue());
    }

    @Test
    void perfilDesconhecidoOuAusenteDa422() {
        Conta admin = nova("ADMINISTRADOR", "Perfil422");
        Conta aluno = nova("ALUNO", "Perfil422Alvo");
        String bearer = "Bearer " + admin.token();

        given().header("Authorization", bearer).contentType(JSON).body(Map.of("perfil", "DONO"))
                .when().put("/admin/usuarios/{id}/perfil", aluno.id())
                .then().statusCode(422).body("error.code", equalTo("PERFIL_INVALIDO"));
        given().header("Authorization", bearer).contentType(JSON).body("{}")
                .when().put("/admin/usuarios/{id}/perfil", aluno.id())
                .then().statusCode(422).body("error.code", equalTo("PERFIL_INVALIDO"));
        given().header("Authorization", bearer).contentType(JSON)
                .when().put("/admin/usuarios/{id}/perfil", aluno.id())
                .then().statusCode(422);
    }

    @Test
    void usuarioInexistenteDa404EmAmbasAsAlteracoes() {
        String bearer = "Bearer " + nova("ADMINISTRADOR", "Inexistente").token();

        given().header("Authorization", bearer).contentType(JSON).body(Map.of("perfil", "ALUNO"))
                .when().put("/admin/usuarios/{id}/perfil", 999_999_999L)
                .then().statusCode(404).body("error.code", equalTo("USUARIO_NAO_ENCONTRADO"));
        given().header("Authorization", bearer).contentType(JSON).body(Map.of("ativo", false))
                .when().put("/admin/usuarios/{id}/ativo", 999_999_999L)
                .then().statusCode(404).body("error.code", equalTo("USUARIO_NAO_ENCONTRADO"));
    }

    @Test
    void administradorNaoMexeNoProprioPerfilNemNaPropriaConta() {
        Conta admin = nova("ADMINISTRADOR", "Auto");
        String bearer = "Bearer " + admin.token();

        given().header("Authorization", bearer).contentType(JSON).body(Map.of("perfil", "ALUNO"))
                .when().put("/admin/usuarios/{id}/perfil", admin.id())
                .then().statusCode(409).body("error.code", equalTo("AUTO_ALTERACAO_NAO_PERMITIDA"));
        given().header("Authorization", bearer).contentType(JSON).body(Map.of("ativo", false))
                .when().put("/admin/usuarios/{id}/ativo", admin.id())
                .then().statusCode(409).body("error.code", equalTo("AUTO_ALTERACAO_NAO_PERMITIDA"));

        assertPerfilEAtivo(admin, "ADMINISTRADOR", true);
        // E a sessão continua valendo: a recusa não derruba ninguém.
        given().header("Authorization", bearer).when().get("/admin/painel").then().statusCode(200);
    }

    // ---- desativar e reativar ----

    @Test
    void desativarImpedeOLoginDerrubaASessaoEReativarDevolveOAcesso() throws InterruptedException {
        Conta admin = nova("ADMINISTRADOR", "Desativa");
        Conta aluno = nova("ALUNO", "Desativado");
        String bearer = "Bearer " + admin.token();

        given().header("Authorization", bearer).contentType(JSON).body(Map.of("ativo", false))
                .when().put("/admin/usuarios/{id}/ativo", aluno.id())
                .then().statusCode(200).body("ativo", equalTo(false));

        given().header("Authorization", "Bearer " + aluno.token())
                .when().get("/usuarios/me")
                .then().statusCode(401);
        given().header("Authorization", "Bearer " + aluno.token())
                .when().post("/auth/refresh")
                .then().statusCode(401);
        given().contentType(JSON).body(Map.of("email", aluno.email(), "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(401)
                .body("error.code", equalTo("CONTA_DESATIVADA"))
                .body("error.message", not(org.hamcrest.Matchers.containsString("Exception")));

        given().header("Authorization", bearer).contentType(JSON).body(Map.of("ativo", true))
                .when().put("/admin/usuarios/{id}/ativo", aluno.id())
                .then().statusCode(200).body("ativo", equalTo(true));

        Thread.sleep(1100);
        given().header("Authorization", "Bearer " + login(aluno.email()))
                .when().get("/usuarios/me")
                .then().statusCode(200);
    }

    @Test
    void ativoAusenteDa422EContaContinuaAtiva() {
        Conta admin = nova("ADMINISTRADOR", "Ativo422");
        Conta aluno = nova("ALUNO", "Ativo422Alvo");

        given().header("Authorization", "Bearer " + admin.token()).contentType(JSON).body("{}")
                .when().put("/admin/usuarios/{id}/ativo", aluno.id())
                .then().statusCode(422);

        assertPerfilEAtivo(aluno, "ALUNO", true);
    }

    @Test
    void listaMostraContaDesativada() {
        Conta admin = nova("ADMINISTRADOR", "ListaInativo");
        Conta aluno = nova("ALUNO", "ListaInativoAlvo");
        String bearer = "Bearer " + admin.token();

        given().header("Authorization", bearer).contentType(JSON).body(Map.of("ativo", false))
                .when().put("/admin/usuarios/{id}/ativo", aluno.id())
                .then().statusCode(200);

        given().header("Authorization", bearer).queryParam("busca", aluno.email())
                .when().get("/admin/usuarios")
                .then().statusCode(200)
                .body("content.ativo", hasItem(false))
                .body("content.id", hasItem((int) aluno.id()))
                .body("content[0].email", notNullValue());
    }

    // ---- apoio ----

    private void assertPerfilEAtivo(Conta conta, String perfil, boolean ativo) {
        Usuario usuario = QuarkusTransaction.requiringNew().call(() -> usuarioRepository.findById(conta.id()));
        org.junit.jupiter.api.Assertions.assertEquals(perfil, usuario.perfil);
        org.junit.jupiter.api.Assertions.assertEquals(ativo, usuario.ativo);
    }

    private Conta nova(String perfil, String marca) {
        String email = "admin.usuarios." + System.nanoTime() + "@catolicasc.edu.br";
        String nome = marca + " " + System.nanoTime();
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
        return new Conta(id, email, nome, login(email));
    }

    private String login(String email) {
        return given().contentType(JSON).body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }
}
