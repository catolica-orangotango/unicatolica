package br.edu.unicatolica.pacext.compartilhado.email;

/** Mensagem de e-mail em texto puro, independente do transporte que vai entregá-la. */
public record MensagemEmail(String destinatario, String nomeDestinatario, String assunto, String texto) {
}
