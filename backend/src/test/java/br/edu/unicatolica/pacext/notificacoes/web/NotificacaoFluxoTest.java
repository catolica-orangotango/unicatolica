package br.edu.unicatolica.pacext.notificacoes.web;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste.Sessao;
import br.edu.unicatolica.pacext.notificacoes.NotificacaoEmissor;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real o contrato da Story 10.2 (RF68, RF69, RF84): resumo, marcar todas,
 * excluir, limite de {@code tamanho}, 401, 404 e isolamento entre usuários. Usa
 * {@link NotificacaoEmissor} (API pública do módulo) para gerar as notificações de teste,
 * nunca a tabela direto (AD-3).
 */
@QuarkusTest
class NotificacaoFluxoTest {

    @Inject
    UsuarioDeTeste usuarioDeTeste;

    @Inject
    NotificacaoEmissor notificacaoEmissor;

    @Test
    void minhasListaMaisRecentePrimeiroComTotalNaoLidas() {
        Sessao sessao = usuarioDeTeste.comPerfil("ALUNO");
        notificacaoEmissor.notificar(sessao.id(), TipoNotificacao.ONBOARDING_PERFIL, "primeira", "/perfil");
        notificacaoEmissor.notificar(sessao.id(), TipoNotificacao.ONBOARDING_PERFIL, "segunda", "/perfil");

        sessao.autenticado().when().get("/notificacoes/me")
                .then().statusCode(200)
                .body("totalNaoLidas", equalTo(2))
                .body("content[0].texto", equalTo("segunda"))
                .body("content[1].texto", equalTo("primeira"));
    }

    @Test
    void tamanhoAcimaDe20EhAjustadoPara20EAbaixoDe1Para1() {
        Sessao sessao = usuarioDeTeste.comPerfil("ALUNO");
        notificacaoEmissor.notificar(sessao.id(), TipoNotificacao.ONBOARDING_PERFIL, "unica", "/perfil");

        sessao.autenticado().when().get("/notificacoes/me?tamanho=100")
                .then().statusCode(200).body("size", equalTo(20));
        sessao.autenticado().when().get("/notificacoes/me?tamanho=0")
                .then().statusCode(200).body("size", equalTo(1));
    }

    @Test
    void resumoDevolveTotalNaoLidasEUltimaNotificacaoId() {
        Sessao sessao = usuarioDeTeste.comPerfil("ALUNO");
        notificacaoEmissor.notificar(sessao.id(), TipoNotificacao.ONBOARDING_PERFIL, "texto", "/perfil");
        Integer id = sessao.autenticado().when().get("/notificacoes/me")
                .then().extract().path("content[0].id");

        sessao.autenticado().when().get("/notificacoes/me/resumo")
                .then().statusCode(200)
                .body("totalNaoLidas", equalTo(1))
                .body("ultimaNotificacaoId", equalTo(id));

        sessao.autenticado().when().post("/notificacoes/{id}/lida", id).then().statusCode(204);

        // Lida nao some do resumo: so deixa de contar como nao lida (RN20 compara o id, nao o total).
        sessao.autenticado().when().get("/notificacoes/me/resumo")
                .then().statusCode(200)
                .body("totalNaoLidas", equalTo(0))
                .body("ultimaNotificacaoId", equalTo(id));
    }

    @Test
    void marcarTodasComoLidasZeraAsNaoLidas() {
        Sessao sessao = usuarioDeTeste.comPerfil("ALUNO");
        notificacaoEmissor.notificar(sessao.id(), TipoNotificacao.ONBOARDING_PERFIL, "a", "/perfil");
        notificacaoEmissor.notificar(sessao.id(), TipoNotificacao.ONBOARDING_PERFIL, "b", "/perfil");

        sessao.autenticado().when().post("/notificacoes/me/lidas").then().statusCode(204);

        sessao.autenticado().when().get("/notificacoes/me/resumo")
                .then().statusCode(200).body("totalNaoLidas", equalTo(0));
    }

    @Test
    void excluirRemoveEASegundaExclusaoDa404() {
        Sessao sessao = usuarioDeTeste.comPerfil("ALUNO");
        notificacaoEmissor.notificar(sessao.id(), TipoNotificacao.ONBOARDING_PERFIL, "texto", "/perfil");
        Integer id = sessao.autenticado().when().get("/notificacoes/me")
                .then().extract().path("content[0].id");

        sessao.autenticado().when().delete("/notificacoes/{id}", id).then().statusCode(204);

        sessao.autenticado().when().get("/notificacoes/me")
                .then().statusCode(200).body("content.size()", equalTo(0));

        sessao.autenticado().when().delete("/notificacoes/{id}", id)
                .then().statusCode(404)
                .body("error.code", equalTo("NOTIFICACAO_NAO_ENCONTRADA"));
    }

    @Test
    void semTokenDa401EmTodosOsEndpoints() {
        given().when().get("/notificacoes/me").then().statusCode(401);
        given().when().get("/notificacoes/me/resumo").then().statusCode(401);
        given().when().post("/notificacoes/1/lida").then().statusCode(401);
        given().when().post("/notificacoes/me/lidas").then().statusCode(401);
        given().when().delete("/notificacoes/1").then().statusCode(401);
    }

    @Test
    void operacoesComIdDeOutroUsuarioDao404() {
        Sessao autor = usuarioDeTeste.comPerfil("ALUNO");
        Sessao outro = usuarioDeTeste.comPerfil("ALUNO");
        notificacaoEmissor.notificar(autor.id(), TipoNotificacao.ONBOARDING_PERFIL, "texto", "/perfil");
        Integer id = autor.autenticado().when().get("/notificacoes/me")
                .then().extract().path("content[0].id");

        outro.autenticado().when().post("/notificacoes/{id}/lida", id)
                .then().statusCode(404).body("error.code", equalTo("NOTIFICACAO_NAO_ENCONTRADA"));
        outro.autenticado().when().delete("/notificacoes/{id}", id)
                .then().statusCode(404).body("error.code", equalTo("NOTIFICACAO_NAO_ENCONTRADA"));

        // Notificacao do autor continua intacta - a tentativa de outro usuario nao afetou nada.
        autor.autenticado().when().get("/notificacoes/me/resumo")
                .then().statusCode(200).body("totalNaoLidas", equalTo(1));
    }
}
