package br.edu.unicatolica.pacext.notificacoes;

/**
 * Tipo de notificação — parte da API pública do módulo (AD-3): outro módulo usa um valor
 * daqui para emitir/consultar/marcar como lida através de {@link NotificacaoEmissor}, sem
 * conhecer a tabela {@code notificacao}.
 */
public enum TipoNotificacao {

    /** Story 4.3/10.1 (RF20.1) — perfil acadêmico sem interesses após o 2º login. */
    ONBOARDING_PERFIL,

    /**
     * Story 10.1 (RF65) — reservado, sem emissor ainda: depende de Publicações ganhar
     * resposta/comentário em postagem, que não existe hoje.
     */
    RESPOSTA_POSTAGEM,

    /**
     * Story 10.1 (RF66) — reservado, sem emissor ainda: depende de um módulo com conteúdo
     * em texto livre (Publicações/Discussões) reconhecer menção a usuário, que não existe hoje.
     */
    MENCAO,

    /**
     * Story 10.1 (RF67) — reservado, sem emissor ainda: depende do módulo Enquetes, que não
     * existe hoje (nem pacote no backend).
     */
    CONVITE_ENQUETE
}
