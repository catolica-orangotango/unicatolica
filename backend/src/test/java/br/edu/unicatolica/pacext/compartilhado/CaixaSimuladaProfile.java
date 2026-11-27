package br.edu.unicatolica.pacext.compartilhado;

import io.quarkus.test.junit.QuarkusTestProfile;
import java.util.Map;

/**
 * Força o transporte SMTP com a caixa simulada do Quarkus ({@code MockMailbox}), mesmo que o
 * {@code .env} local aponte para um provedor real (ex.: {@code EMAIL_TRANSPORTE=brevo-api}). Sem isto,
 * um teste que cadastra usuário tenta enviar e-mail de verdade na máquina de quem o roda.
 */
public class CaixaSimuladaProfile implements QuarkusTestProfile {

    @Override
    public Map<String, String> getConfigOverrides() {
        return Map.of("app.email.transporte", "smtp", "quarkus.mailer.mock", "true");
    }
}
