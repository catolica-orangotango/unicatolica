package br.edu.unicatolica.pacext.compartilhado.email;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.event.TransactionPhase;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * Serviço injetável de envio de e-mail — infraestrutura transversal (mesmo espírito de
 * {@link br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService}), não
 * pertence a nenhum módulo de domínio.
 *
 * <p>Monta a mensagem e delega a entrega ao {@link TransporteEmail} escolhido por
 * {@code app.email.transporte} — trocar de provedor não muda código (ver
 * {@code .env.example}).</p>
 *
 * <p>O envio acontece só depois do commit da transação de quem chamou: cadastro desfeito
 * não manda e-mail, e falha do provedor não desfaz o cadastro — só é registrada no log,
 * e o usuário pode pedir o reenvio ({@code POST /auth/confirmacao-email/reenvio}).</p>
 */
@ApplicationScoped
public class EmailService {

    private static final Logger LOG = Logger.getLogger(EmailService.class);

    @Inject
    Instance<TransporteEmail> transportes;

    @Inject
    Event<MensagemEmail> mensagens;

    @ConfigProperty(name = "app.email.transporte")
    String transporteConfigurado;

    /** Falha na subida se {@code EMAIL_TRANSPORTE} não corresponde a nenhum transporte. */
    void validarTransporte(@Observes StartupEvent evento) {
        if (!transportes.isResolvable()) {
            throw new IllegalStateException("app.email.transporte=" + transporteConfigurado
                    + " não corresponde a nenhuma implementação de TransporteEmail");
        }
    }

    public void enviarConfirmacaoCadastro(String destinatario, String nome, String linkConfirmacao) {
        String corpo = """
                Olá, %s!

                Confirme seu e-mail para começar a usar a UniCatólica:

                %s

                Se você não fez este cadastro, ignore esta mensagem.
                """.formatted(nome, linkConfirmacao);

        mensagens.fire(new MensagemEmail(destinatario, nome, "Confirme seu e-mail — UniCatólica", corpo));
    }

    /** Sem transação ativa, o CDI entrega na hora; com transação, só após o commit. */
    void entregarAposCommit(@Observes(during = TransactionPhase.AFTER_SUCCESS) MensagemEmail mensagem) {
        try {
            transportes.get().enviar(mensagem);
        } catch (RuntimeException e) {
            LOG.errorf(e, "Falha ao enviar e-mail \"%s\" para %s via %s",
                    mensagem.assunto(), mensagem.destinatario(), transporteConfigurado);
        }
    }
}
