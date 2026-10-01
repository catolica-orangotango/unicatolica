package br.edu.unicatolica.pacext.compartilhado.email;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa o contrato HTTP com a Brevo contra um servidor local que imita a API. */
class BrevoApiTransporteEmailTest {

    private static final MensagemEmail MENSAGEM =
            new MensagemEmail("ana@catolicasc.edu.br", "Ana", "Confirme seu e-mail", "Olá, Ana!");

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicReference<String> apiKeyRecebida = new AtomicReference<>();
    private final AtomicReference<String> corpoRecebido = new AtomicReference<>();

    private HttpServer servidor;
    private int statusResposta;
    private BrevoApiTransporteEmail transporte;

    @BeforeEach
    void sobeServidor() throws IOException {
        statusResposta = 201;
        servidor = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        servidor.createContext("/v3/smtp/email", troca -> {
            apiKeyRecebida.set(troca.getRequestHeaders().getFirst("api-key"));
            corpoRecebido.set(new String(troca.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] resposta = "{\"messageId\":\"<1@brevo>\"}".getBytes(StandardCharsets.UTF_8);
            troca.sendResponseHeaders(statusResposta, resposta.length);
            troca.getResponseBody().write(resposta);
            troca.close();
        });
        servidor.start();

        transporte = new BrevoApiTransporteEmail();
        transporte.objectMapper = objectMapper;
        transporte.url = "http://localhost:" + servidor.getAddress().getPort() + "/v3/smtp/email";
        transporte.apiKey = Optional.of("chave-teste");
        transporte.remetente = "time@exemplo.com";
        transporte.remetenteNome = "UniCatólica";
    }

    @AfterEach
    void derrubaServidor() {
        servidor.stop(0);
    }

    @Test
    void enviaComChaveRemetenteEDestinatario() throws IOException {
        transporte.enviar(MENSAGEM);

        assertEquals("chave-teste", apiKeyRecebida.get());
        JsonNode corpo = objectMapper.readTree(corpoRecebido.get());
        assertEquals("time@exemplo.com", corpo.at("/sender/email").asText());
        assertEquals("UniCatólica", corpo.at("/sender/name").asText());
        assertEquals("ana@catolicasc.edu.br", corpo.at("/to/0/email").asText());
        assertEquals("Ana", corpo.at("/to/0/name").asText());
        assertEquals("Confirme seu e-mail", corpo.at("/subject").asText());
        assertEquals("Olá, Ana!", corpo.at("/textContent").asText());
    }

    @Test
    void falhaQuandoABrevoRecusa() {
        statusResposta = 401;

        IllegalStateException erro = assertThrows(IllegalStateException.class, () -> transporte.enviar(MENSAGEM));
        assertTrue(erro.getMessage().contains("HTTP 401"));
    }

    @Test
    void falhaSemChaveConfigurada() {
        transporte.apiKey = Optional.of(" ");

        IllegalStateException erro = assertThrows(IllegalStateException.class, () -> transporte.enviar(MENSAGEM));
        assertTrue(erro.getMessage().contains("BREVO_API_KEY"));
    }
}
