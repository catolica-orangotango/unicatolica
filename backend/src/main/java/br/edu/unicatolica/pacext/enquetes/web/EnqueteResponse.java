package br.edu.unicatolica.pacext.enquetes.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.enquetes.dominio.Enquete;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Schema {@code EnqueteResponse} do contrato. */
public record EnqueteResponse(Long id, Long comunidadeId, AutorResumo autor, String pergunta, String tipo,
        Integer limiteSelecao, List<EnqueteOpcaoResponse> opcoes, String situacao, Instant criadaEm) {

    static EnqueteResponse de(Enquete enquete, UsuarioResumo autor) {
        List<EnqueteOpcaoResponse> opcoes = enquete.opcoes.stream()
                .map(o -> new EnqueteOpcaoResponse(o.id, o.texto))
                .toList();
        return new EnqueteResponse(enquete.id, enquete.comunidadeId,
                AutorResumo.de(enquete.autorUsuarioId, autor), enquete.pergunta, enquete.tipo.name(),
                enquete.limiteSelecao, opcoes, enquete.situacao.name(), enquete.criadaEm);
    }

    /** Converte a página inteira buscando os autores em lote, sem N+1. */
    static PageResponse<EnqueteResponse> pagina(PageResponse<Enquete> resultado, UsuarioConsulta usuarioConsulta) {
        List<Long> autorIds = resultado.content().stream().map(e -> e.autorUsuarioId).distinct().toList();
        Map<Long, UsuarioResumo> autores = usuarioConsulta.buscarResumos(autorIds);
        List<EnqueteResponse> conteudo = resultado.content().stream()
                .map(e -> de(e, autores.get(e.autorUsuarioId)))
                .toList();
        return new PageResponse<>(conteudo, resultado.page(), resultado.size(), resultado.totalElements(),
                resultado.totalPages());
    }
}
