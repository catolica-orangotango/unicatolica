package br.edu.unicatolica.pacext.moderacao.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.specification.RequestSpecification;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real o contrato da Moderação (Stories 12.1, 12.4 e 12.5): caminho feliz,
 * 401, 403, 404, 409 e cada 422 do {@code openapi.yaml}. Usa usuários próprios: autor,
 * dois denunciantes e um moderador, criados a cada teste.
 */
@QuarkusTest
class ModeracaoFluxoTest {

    private static final String SENHA = "Senha123!";
    private static final long INEXISTENTE = 999_999L;

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    PasswordHasher passwordHasher;

    private String autor;
    private String denunciante;
    private String outroDenunciante;
    private String moderador;
    private Integer comunidadeId;
    private Integer publicacaoId;

    @BeforeEach
    void criaUsuariosEPostagem() {
        autor = login("Autora Moderação", "ALUNO");
        denunciante = login("Denunciante Um", "ALUNO");
        outroDenunciante = login("Denunciante Dois", "ALUNO");
        moderador = login("Moderador Teste", "MODERADOR");

        // Quem cria a comunidade aberta vira membro dela (RF23) e pode publicar.
        comunidadeId = como(autor).contentType(JSON)
                .body(Map.of("nome", "Moderação " + UUID.randomUUID()))
                .when().post("/comunidades")
                .then().statusCode(201)
                .extract().path("id");
        publicacaoId = como(autor).contentType(JSON)
                .body(Map.of("conteudo", "postagem denunciada"))
                .when().post("/comunidades/{id}/publicacoes", comunidadeId)
                .then().statusCode(201)
                .extract().path("id");
    }

    @Test
    void denunciaOcultaERestaura() {
        Integer denuncia = denunciar(denunciante, "spam");
        Integer outra = denunciar(outroDenunciante, "ofensivo");

        String fila = como(moderador).queryParam("tamanho", 100)
                .when().get("/moderacao/denuncias")
                .then().statusCode(200)
                .body("content.id", hasItems(denuncia, outra))
                .extract().asString();
        // RF77.1: nenhum campo com a identidade do denunciante.
        assertFalse(fila.contains("denunciante"));
        assertFalse(fila.contains("Denunciante Um"));

        como(moderador).when().get("/moderacao/denuncias/{id}", denuncia)
                .then().statusCode(200)
                .body("id", equalTo(denuncia))
                .body("motivo", equalTo("spam"))
                .body("situacao", equalTo("PENDENTE"))
                .body("criadoEm", notNullValue())
                .body("resolvidaEm", nullValue())
                .body("conteudo.tipo", equalTo("PUBLICACAO"))
                .body("conteudo.id", equalTo(publicacaoId))
                .body("conteudo.texto", equalTo("postagem denunciada"))
                .body("conteudo.autor.nome", equalTo("Autora Moderação"))
                .body("conteudo.comunidadeId", equalTo(comunidadeId))
                .body("conteudo.situacao", equalTo("VISIVEL"));

        como(moderador).contentType(JSON).body(Map.of("motivo", "Conteúdo ofensivo."))
                .when().post("/moderacao/denuncias/{id}/ocultacao", denuncia)
                .then().statusCode(200)
                .body("situacao", equalTo("RESOLVIDA"))
                .body("resolvidaEm", notNullValue())
                .body("conteudo.situacao", equalTo("OCULTO"));

        // Ocultar resolve as outras denúncias pendentes do mesmo conteúdo.
        como(moderador).when().get("/moderacao/denuncias/{id}", outra)
                .then().statusCode(200)
                .body("situacao", equalTo("RESOLVIDA"));
        como(moderador).queryParam("situacao", "RESOLVIDA").queryParam("tamanho", 100)
                .when().get("/moderacao/denuncias")
                .then().statusCode(200)
                .body("content.id", hasItems(denuncia, outra));
        feedSemAPostagem();

        // Oculta parou de aceitar interações (RF78).
        como(login("Terceiro", "ALUNO")).contentType(JSON)
                .body(Map.of("tipoConteudo", "PUBLICACAO", "conteudoId", publicacaoId, "motivo", "spam"))
                .when().post("/denuncias")
                .then().statusCode(404)
                .body("error.code", equalTo("CONTEUDO_NAO_ENCONTRADO"));
        como(moderador).contentType(JSON).body(Map.of("motivo", "de novo"))
                .when().post("/moderacao/denuncias/{id}/ocultacao", denuncia)
                .then().statusCode(409)
                .body("error.code", equalTo("SITUACAO_INVALIDA"));

        // Qualquer moderador restaura, não só quem ocultou (RF78.1).
        como(login("Outro Moderador", "MODERADOR"))
                .when().post("/moderacao/denuncias/{id}/restauracao", outra)
                .then().statusCode(200)
                .body("situacao", equalTo("RESOLVIDA"))
                .body("conteudo.situacao", equalTo("VISIVEL"));
        como(autor).when().get("/comunidades/{id}/publicacoes", comunidadeId)
                .then().statusCode(200)
                .body("content.id", hasItem(publicacaoId))
                .body("totalElements", equalTo(1));
        como(moderador).when().post("/moderacao/denuncias/{id}/restauracao", denuncia)
                .then().statusCode(409)
                .body("error.code", equalTo("SITUACAO_INVALIDA"));
    }

    @Test
    void descartarEncerraSemMexerNaPostagem() {
        Integer denuncia = denunciar(denunciante, "não gostei");

        como(moderador).when().post("/moderacao/denuncias/{id}/descarte", denuncia)
                .then().statusCode(200)
                .body("situacao", equalTo("DESCARTADA"))
                .body("conteudo.situacao", equalTo("VISIVEL"));
        como(moderador).queryParam("tamanho", 100)
                .when().get("/moderacao/denuncias")
                .then().statusCode(200)
                .body("content.id", not(hasItem(denuncia)));
        como(moderador).contentType(JSON).body(Map.of("motivo", "improcedente"))
                .when().post("/moderacao/denuncias/{id}/descarte", denuncia)
                .then().statusCode(409)
                .body("error.code", equalTo("SITUACAO_INVALIDA"));
        como(autor).when().get("/comunidades/{id}/publicacoes", comunidadeId)
                .then().statusCode(200)
                .body("content.id", hasItem(publicacaoId));
    }

    @Test
    void semTokenDa401() {
        given().contentType(JSON).body(Map.of("tipoConteudo", "PUBLICACAO", "conteudoId", publicacaoId, "motivo", "x"))
                .when().post("/denuncias").then().statusCode(401).body("error.code", notNullValue());
        given().when().get("/moderacao/denuncias").then().statusCode(401).body("error.code", notNullValue());
        given().when().get("/moderacao/denuncias/1").then().statusCode(401).body("error.code", notNullValue());
        given().contentType(JSON).body(Map.of("motivo", "x"))
                .when().post("/moderacao/denuncias/1/ocultacao").then().statusCode(401);
        given().when().post("/moderacao/denuncias/1/restauracao").then().statusCode(401);
        given().when().post("/moderacao/denuncias/1/descarte").then().statusCode(401);
    }

    @Test
    void alunoNaoAcessaAModeracaoDa403() {
        Integer denuncia = denunciar(denunciante, "spam");

        como(denunciante).when().get("/moderacao/denuncias")
                .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
        como(denunciante).when().get("/moderacao/denuncias/{id}", denuncia)
                .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
        como(denunciante).contentType(JSON).body(Map.of("motivo", "x"))
                .when().post("/moderacao/denuncias/{id}/ocultacao", denuncia)
                .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
        como(denunciante).when().post("/moderacao/denuncias/{id}/restauracao", denuncia)
                .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
        como(denunciante).when().post("/moderacao/denuncias/{id}/descarte", denuncia)
                .then().statusCode(403).body("error.code", equalTo("ACESSO_NEGADO"));
    }

    @Test
    void autorNaoDenunciaAPropriaPostagemDa403() {
        como(autor).contentType(JSON)
                .body(Map.of("tipoConteudo", "PUBLICACAO", "conteudoId", publicacaoId, "motivo", "spam"))
                .when().post("/denuncias")
                .then().statusCode(403)
                .body("error.code", equalTo("DENUNCIA_PROPRIO_CONTEUDO"));
    }

    @Test
    void inexistenteDa404() {
        como(denunciante).contentType(JSON)
                .body(Map.of("tipoConteudo", "PUBLICACAO", "conteudoId", INEXISTENTE, "motivo", "spam"))
                .when().post("/denuncias")
                .then().statusCode(404).body("error.code", equalTo("CONTEUDO_NAO_ENCONTRADO"));
        como(moderador).when().get("/moderacao/denuncias/{id}", INEXISTENTE)
                .then().statusCode(404).body("error.code", equalTo("DENUNCIA_NAO_ENCONTRADA"));
        como(moderador).contentType(JSON).body(Map.of("motivo", "x"))
                .when().post("/moderacao/denuncias/{id}/ocultacao", INEXISTENTE)
                .then().statusCode(404).body("error.code", equalTo("DENUNCIA_NAO_ENCONTRADA"));
        como(moderador).when().post("/moderacao/denuncias/{id}/restauracao", INEXISTENTE)
                .then().statusCode(404).body("error.code", equalTo("DENUNCIA_NAO_ENCONTRADA"));
        como(moderador).when().post("/moderacao/denuncias/{id}/descarte", INEXISTENTE)
                .then().statusCode(404).body("error.code", equalTo("DENUNCIA_NAO_ENCONTRADA"));
    }

    @Test
    void mesmaPessoaDenunciandoDuasVezesDa409() {
        denunciar(denunciante, "spam");

        como(denunciante).contentType(JSON)
                .body(Map.of("tipoConteudo", "PUBLICACAO", "conteudoId", publicacaoId, "motivo", "de novo"))
                .when().post("/denuncias")
                .then().statusCode(409)
                .body("error.code", equalTo("DENUNCIA_DUPLICADA"));
    }

    @Test
    void entradaInvalidaDa422() {
        como(denunciante).contentType(JSON)
                .body(Map.of("tipoConteudo", "PUBLICACAO", "conteudoId", publicacaoId, "motivo", "   "))
                .when().post("/denuncias")
                .then().statusCode(422)
                .body("error.code", equalTo("CAMPO_OBRIGATORIO"))
                .body("error.details", equalTo("motivo"));
        como(denunciante).contentType(JSON)
                .body(Map.of("tipoConteudo", "PUBLICACAO", "conteudoId", publicacaoId, "motivo", "a".repeat(1001)))
                .when().post("/denuncias")
                .then().statusCode(422).body("error.code", equalTo("MOTIVO_MUITO_LONGO"));
        como(denunciante).contentType(JSON)
                .body(Map.of("tipoConteudo", "ENQUETE", "conteudoId", publicacaoId, "motivo", "spam"))
                .when().post("/denuncias")
                .then().statusCode(422).body("error.code", equalTo("TIPO_CONTEUDO_INVALIDO"));
        como(denunciante).contentType(JSON).body(Map.of("motivo", "spam"))
                .when().post("/denuncias")
                .then().statusCode(422).body("error.code", equalTo("CAMPO_OBRIGATORIO"));

        Integer denuncia = denunciar(denunciante, "spam");
        como(moderador).contentType(JSON).body(Map.of())
                .when().post("/moderacao/denuncias/{id}/ocultacao", denuncia)
                .then().statusCode(422)
                .body("error.code", equalTo("CAMPO_OBRIGATORIO"))
                .body("error.details", equalTo("motivo"));
        como(moderador).queryParam("situacao", "ESCALONADA")
                .when().get("/moderacao/denuncias")
                .then().statusCode(422).body("error.code", equalTo("PARAMETRO_INVALIDO"));
    }

    private Integer denunciar(String token, String motivo) {
        return como(token).contentType(JSON)
                .body(Map.of("tipoConteudo", "PUBLICACAO", "conteudoId", publicacaoId, "motivo", motivo))
                .when().post("/denuncias")
                .then().statusCode(201)
                .body("criadoEm", notNullValue())
                .extract().path("id");
    }

    private void feedSemAPostagem() {
        como(autor).when().get("/comunidades/{id}/publicacoes", comunidadeId)
                .then().statusCode(200)
                .body("content.id", not(hasItem(publicacaoId)))
                .body("totalElements", equalTo(0));
    }

    private RequestSpecification como(String token) {
        return given().header("Authorization", "Bearer " + token);
    }

    private String login(String nome, String perfil) {
        String email = "moderacao." + System.nanoTime() + "@catolicasc.edu.br";
        QuarkusTransaction.requiringNew().run(() -> {
            Usuario usuario = new Usuario();
            usuario.nome = nome;
            usuario.email = email;
            usuario.senhaHash = passwordHasher.gerarHash(SENHA);
            usuario.perfil = perfil;
            usuario.emailConfirmado = true;
            usuario.criadoEm = Instant.now();
            usuarioRepository.persist(usuario);
        });
        return given().contentType(JSON).body(Map.of("email", email, "senha", SENHA))
                .when().post("/auth/login")
                .then().statusCode(200)
                .extract().path("token");
    }
}
