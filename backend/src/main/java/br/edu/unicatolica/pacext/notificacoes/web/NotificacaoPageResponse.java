package br.edu.unicatolica.pacext.notificacoes.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.notificacoes.dominio.Notificacao;
import java.util.List;

/** Espelha o schema {@code NotificacaoPageResponse} do openapi.yaml (Story 10.2, RN04). */
public record NotificacaoPageResponse(List<NotificacaoResponse> content, int page, int size, long totalElements,
        int totalPages, long totalNaoLidas) {

    public static NotificacaoPageResponse de(PageResponse<Notificacao> pagina, long totalNaoLidas) {
        return new NotificacaoPageResponse(pagina.content().stream().map(NotificacaoResponse::de).toList(),
                pagina.page(), pagina.size(), pagina.totalElements(), pagina.totalPages(), totalNaoLidas);
    }
}
