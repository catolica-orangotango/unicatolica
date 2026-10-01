package br.edu.unicatolica.pacext.compartilhado.email;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.arc.lookup.LookupIfProperty;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Transporte pela API HTTP transacional da Brevo ({@code POST /v3/smtp/email}). Existe
 * porque o Render free tier bloqueia SMTP de saída; HTTPS (443) passa. Sem domínio
 * próprio, o remetente ({@code MAIL_FROM}) precisa ser um endereço verificado na Brevo.
 */
@ApplicationScoped
@LookupIfProperty(name = "app.email.transporte", stringValue = "brevo-api")
public class BrevoApiTransporteEmail implements TransporteEmail {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    @Inject
    ObjectMapper objectMapper;

    @ConfigProperty(name = "app.email.brevo.url")
    String url;

    @ConfigProperty(name = "app.email.brevo.api-key")
    Optional<String> apiKey;

    @ConfigProperty(name = "app.email.remetente")
    String remetente;

    @ConfigProperty(name = "app.email.remetente-nome")
    String remetenteNome;

    private final HttpClient httpClient =HttpClient.newBuilder().connectTimeout(TIMEOUT).build();

    @Override
    public void enviar(MensagemEmail mensagem) {
        String chave = apiKey.filter(valor -> !valor.isBlank())
                .orElseThrow(() -> new IllegalStateException(
                        "EMAIL_TRANSPORTE=brevo-api exige BREVO_API_KEY configurada"));

        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(TIMEOUT)
                .header("api-key", chave)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(corpo(mensagem)))
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new IllegalStateException("Falha de rede ao chamar a API da Brevo", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Envio pela API da Brevo interrompido", e);
        }

        int status = response.statusCode();
        if (status < 200 || status >= 300) {
            throw new IllegalStateException(
                    "API da Brevo recusou o envio: HTTP " + status + " " + response.body());
        }
    }

    private String corpo(MensagemEmail mensagem) {
        String nome = mensagem.nomeDestinatario();
        Map<String, String> destinatario = nome == null || nome.isBlank()
                ? Map.of("email", mensagem.destinatario())
                : Map.of("email", mensagem.destinatario(), "name", nome);
        Map<String, Object> corpo = Map.of(
                "sender", Map.of("name", remetenteNome, "email", remetente),
                "to", List.of(destinatario),
                "subject", mensagem.assunto(),
                "textContent", mensagem.texto());
        try {
            return objectMapper.writeValueAsString(corpo);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Falha ao serializar o e-mail para a API da Brevo", e);
        }
    }
}
