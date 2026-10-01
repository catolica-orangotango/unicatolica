package br.edu.unicatolica.pacext.compartilhado.email;

import io.quarkus.arc.lookup.LookupIfProperty;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Transporte SMTP via {@code quarkus-mailer}. Host, porta, credenciais e TLS vêm de
 * {@code QUARKUS_MAILER_*}; sem host, dev/{@code %test} usam a mailbox mock do Quarkus
 * (nada sai pela rede; visível no log e em {@code /q/dev-ui}).
 */
@ApplicationScoped
@LookupIfProperty(name = "app.email.transporte", stringValue = "smtp", lookupIfMissing = true)
public class SmtpTransporteEmail implements TransporteEmail {

    @Inject
    Mailer mailer;

    @Override
    public void enviar(MensagemEmail mensagem) {
        mailer.send(Mail.withText(mensagem.destinatario(), mensagem.assunto(), mensagem.texto()));
    }
}
