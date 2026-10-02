package br.edu.unicatolica.pacext.notificacoes;

/**
 * Interface pública do módulo Notificações (AD-3) para emitir e consultar notificações de
 * outro módulo — nenhum módulo externo injeta {@code dominio.NotificacaoRepository}
 * diretamente.
 */
public interface NotificacaoEmissor {

    /** Cria uma notificação para {@code usuarioId}. {@code link} pode ser {@code null}. */
    void notificar(Long usuarioId, TipoNotificacao tipo, String texto, String link);

    /**
     * Usado por quem emite para evitar duplicar uma notificação que o usuário ainda não
     * leu (ex.: onboarding progressivo, que não deve empilhar um aviso a cada login).
     */
    boolean possuiNaoLidaDoTipo(Long usuarioId, TipoNotificacao tipo);

    /**
     * Marca como lidas todas as notificações de {@code tipo} para {@code usuarioId} — usado
     * por quem emite quando a condição que gerou o aviso deixa de valer (ex.: perfil
     * acadêmico completado), sem esperar o usuário abrir a lista de notificações.
     */
    void marcarComoLidaPorTipo(Long usuarioId, TipoNotificacao tipo);
}
