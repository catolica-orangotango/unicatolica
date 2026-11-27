package br.edu.unicatolica.pacext.notificacoes.web;

import br.edu.unicatolica.pacext.notificacoes.aplicacao.ResumoNotificacoes;

/** Espelha o schema {@code NotificacaoResumoResponse} do openapi.yaml (Story 10.2, RF69.4). */
public record NotificacaoResumoResponse(long totalNaoLidas, Long ultimaNotificacaoId) {

    public static NotificacaoResumoResponse de(ResumoNotificacoes resumo) {
        return new NotificacaoResumoResponse(resumo.totalNaoLidas(), resumo.ultimaNotificacaoId());
    }
}
