package br.edu.unicatolica.pacext.compartilhado.email;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.mailer.Mail;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Prova a regra de entrega do {@link EmailService} sobre o CDI/JTA real, com o transporte
 * padrão ({@code smtp}) caindo na mailbox mock do Quarkus: só envia após o commit e nunca
 * quando a transação de quem chamou é desfeita.
 */
@QuarkusTest
class EmailServiceTest {

    private static final String LINK = "http://localhost:4200/confirmar-email?token=abc";

    @Inject
    EmailService emailService;

    @Inject
    MockMailbox mailbox;

    private String destinatario;

    @BeforeEach
    void limpaMailbox() {
        mailbox.clear();
        destinatario = "email." + System.nanoTime() + "@catolicasc.edu.br";
    }

    @Test
    void enviaDepoisDoCommit() {
        QuarkusTransaction.requiringNew().run(() -> {
            emailService.enviarConfirmacaoCadastro(destinatario, "Ana", LINK);
            assertTrue(mailbox.getMailsSentTo(destinatario).isEmpty(), "não pode enviar antes do commit");
        });

        List<Mail> enviados = mailbox.getMailsSentTo(destinatario);
        assertEquals(1, enviados.size());
        assertEquals("Confirme seu e-mail — UniCatólica", enviados.get(0).getSubject());
        assertTrue(enviados.get(0).getText().contains(LINK));
    }

    @Test
    void naoEnviaQuandoATransacaoEDesfeita() {
        assertThrows(IllegalStateException.class, () -> QuarkusTransaction.requiringNew().run(() -> {
            emailService.enviarConfirmacaoCadastro(destinatario, "Ana", LINK);
            throw new IllegalStateException("cadastro falhou");
        }));

        assertTrue(mailbox.getMailsSentTo(destinatario).isEmpty());
    }

    @Test
    void enviaNaHoraSemTransacaoAtiva() {
        emailService.enviarConfirmacaoCadastro(destinatario, "Ana", LINK);

        assertEquals(1, mailbox.getMailsSentTo(destinatario).size());
    }
}
