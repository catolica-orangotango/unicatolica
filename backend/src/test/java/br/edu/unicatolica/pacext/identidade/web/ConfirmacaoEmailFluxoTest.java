package br.edu.unicatolica.pacext.identidade.web;

import static io.restassured.RestAssured.given;
import static io.restassured.http.ContentType.JSON;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.edu.unicatolica.pacext.compartilhado.CaixaSimuladaProfile;
import br.edu.unicatolica.pacext.compartilhado.UsuarioDeTeste;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova pelo HTTP real o fluxo cadastro → e-mail → confirmação → login (Story 1.3, RF01.2):
 * {@code POST /auth/registro}, {@code POST /auth/confirmacao-email/{token}},
 * {@code POST /auth/confirmacao-email/reenvio} e {@code POST /auth/login}. O e-mail é lido na
 * caixa simulada do Quarkus ({@link MockMailbox}); o envio real pela Brevo fica fora (provedor
 * externo). O envio acontece depois do commit, então o e-mail só aparece quando a requisição de
 * cadastro termina.
 */
@QuarkusTest
@TestProfile(CaixaSimuladaProfile.class)
class ConfirmacaoEmailFluxoTest {

    private static final Pattern TOKEN_NO_LINK = Pattern.compile("confirmar-email\\?token=([A-Za-z0-9_-]+)");

    @Inject
    MockMailbox mailbox;

    @Inject
    UsuarioRepository usuarioRepository;

    private String email;

    @BeforeEach
    void cadastra() {
        mailbox.clear();
        email = "confirma." + System.nanoTime() + "@catolicasc.edu.br";
        Map<String, Object> corpo = new HashMap<>();
        corpo.put("nome", "Aluno Confirma");
        corpo.put("email", email);
        corpo.put("senha", UsuarioDeTeste.SENHA);
        corpo.put("cursoId", UsuarioDeTeste.idDoCurso("Administração"));
        corpo.put("dataNascimento", "2000-01-01");
        corpo.put("aceiteTermos", true);

        given().contentType(JSON).body(corpo)
                .when().post("/auth/registro")
                .then().statusCode(201)
                .body("emailConfirmado", equalTo(false));
    }

    @Test
    void cadastroEnviaEmailEAConfirmacaoLiberaOLogin() {
        String token = ultimoTokenEnviado();

        given().when().post("/auth/confirmacao-email/{token}", token)
                .then().statusCode(204);

        login().then().statusCode(200).body("token", notNullValue());
    }

    @Test
    void loginAntesDeConfirmarDa401EmailNaoConfirmado() {
        login().then().statusCode(401).body("error.code", equalTo("EMAIL_NAO_CONFIRMADO"));
    }

    @Test
    void senhaErradaAntesDeConfirmarNaoRevelaQueOEmailExiste() {
        given().contentType(JSON).body(Map.of("email", email, "senha", "SenhaErrada1!"))
                .when().post("/auth/login")
                .then().statusCode(401)
                .body("error.code", equalTo("CREDENCIAL_INVALIDA"));
    }

    @Test
    void tokenInexistenteDa404() {
        given().when().post("/auth/confirmacao-email/{token}", "token-que-nao-existe")
                .then().statusCode(404)
                .body("error.code", equalTo("TOKEN_CONFIRMACAO_INVALIDO"));
    }

    @Test
    void tokenExpiradoDa422ENaoConfirma() {
        String token = ultimoTokenEnviado();
        QuarkusTransaction.requiringNew().run(() -> usuarioRepository.buscarPorEmail(email).orElseThrow()
                .tokenConfirmacaoExpiraEm = Instant.now().minus(1, ChronoUnit.HOURS));

        given().when().post("/auth/confirmacao-email/{token}", token)
                .then().statusCode(422)
                .body("error.code", equalTo("TOKEN_CONFIRMACAO_EXPIRADO"));

        login().then().statusCode(401).body("error.code", equalTo("EMAIL_NAO_CONFIRMADO"));
    }

    @Test
    void confirmarDuasVezesEIdempotente() {
        String token = ultimoTokenEnviado();

        given().when().post("/auth/confirmacao-email/{token}", token).then().statusCode(204);
        given().when().post("/auth/confirmacao-email/{token}", token).then().statusCode(204);

        login().then().statusCode(200);
    }

    @Test
    void reenvioMandaNovoEmailComNovoTokenEOAntigoDeixaDeValer() {
        String antigo = ultimoTokenEnviado();
        mailbox.clear();

        given().contentType(JSON).body(Map.of("email", email))
                .when().post("/auth/confirmacao-email/reenvio")
                .then().statusCode(202);

        String novo = ultimoTokenEnviado();
        assertTrue(!antigo.equals(novo), "o reenvio gera um token novo");

        // O token antigo é substituído: deixa de ser achado (404), e o novo confirma.
        given().when().post("/auth/confirmacao-email/{token}", antigo)
                .then().statusCode(404)
                .body("error.code", equalTo("TOKEN_CONFIRMACAO_INVALIDO"));
        given().when().post("/auth/confirmacao-email/{token}", novo).then().statusCode(204);
        login().then().statusCode(200);
    }

    @Test
    void reenvioNuncaRevelaSeOEmailExisteNemMandaParaContaJaConfirmada() {
        // E-mail desconhecido: 202 igual ao de um existente, e nada é enviado.
        String desconhecido = "ninguem." + System.nanoTime() + "@catolicasc.edu.br";
        given().contentType(JSON).body(Map.of("email", desconhecido))
                .when().post("/auth/confirmacao-email/reenvio")
                .then().statusCode(202);
        assertTrue(mailbox.getMailsSentTo(desconhecido).isEmpty());

        // Conta já confirmada: 202 e nenhum e-mail novo.
        String token = ultimoTokenEnviado();
        given().when().post("/auth/confirmacao-email/{token}", token).then().statusCode(204);
        mailbox.clear();

        given().contentType(JSON).body(Map.of("email", email))
                .when().post("/auth/confirmacao-email/reenvio")
                .then().statusCode(202);
        assertTrue(mailbox.getMailsSentTo(email).isEmpty());
    }

    private io.restassured.response.Response login() {
        return given().contentType(JSON).body(Map.of("email", email, "senha", UsuarioDeTeste.SENHA))
                .when().post("/auth/login");
    }

    /** Token do link do último e-mail de confirmação enviado a {@code email}. */
    private String ultimoTokenEnviado() {
        List<io.quarkus.mailer.Mail> enviados = mailbox.getMailsSentTo(email);
        assertTrue(!enviados.isEmpty(), "o cadastro deve enviar o e-mail de confirmação");
        Matcher matcher = TOKEN_NO_LINK.matcher(enviados.get(enviados.size() - 1).getText());
        assertTrue(matcher.find(), "o e-mail deve ter o link de confirmação");
        return matcher.group(1);
    }
}
