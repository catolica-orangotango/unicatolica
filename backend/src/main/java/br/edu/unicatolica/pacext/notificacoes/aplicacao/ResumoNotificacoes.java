package br.edu.unicatolica.pacext.notificacoes.aplicacao;

/** Story 10.2 (RF69.4) — resultado de {@code GET /notificacoes/me/resumo}, uso interno do módulo. */
public record ResumoNotificacoes(long totalNaoLidas, Long ultimaNotificacaoId) {
}
