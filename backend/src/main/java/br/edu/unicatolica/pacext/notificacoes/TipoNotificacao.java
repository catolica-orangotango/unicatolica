package br.edu.unicatolica.pacext.notificacoes;

/**
 * Tipo de notificação — parte da API pública do módulo (AD-3): outro módulo usa um valor
 * daqui para emitir/consultar/marcar como lida através de {@link NotificacaoEmissor}, sem
 * conhecer a tabela {@code notificacao}.
 */
public enum TipoNotificacao {

    /** Story 4.3/10.1 (RF20.1) — perfil acadêmico sem interesses após o 2º login. */
    ONBOARDING_PERFIL
}
