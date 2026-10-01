package br.edu.unicatolica.pacext.compartilhado.email;

/**
 * Entrega uma {@link MensagemEmail} por um canal concreto (SMTP, API HTTP de um provedor...).
 *
 * <p>A implementação ativa é escolhida em runtime por {@code app.email.transporte}
 * (variável {@code EMAIL_TRANSPORTE}) — trocar de provedor é só configuração:</p>
 * <ul>
 *   <li>{@code smtp} (padrão) — {@link SmtpTransporteEmail}, qualquer provedor SMTP
 *       (Brevo, Resend, Gmail, SMTP institucional) via {@code QUARKUS_MAILER_*};</li>
 *   <li>{@code brevo-api} — {@link BrevoApiTransporteEmail}, API HTTP da Brevo, para
 *       hospedagens que bloqueiam as portas SMTP de saída (ex.: Render free tier).</li>
 * </ul>
 */
public interface TransporteEmail {

    /** Envia a mensagem; lança exceção se o canal recusar ou falhar. */
    void enviar(MensagemEmail mensagem);
}
