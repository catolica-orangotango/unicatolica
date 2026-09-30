package br.edu.unicatolica.pacext.publicacoes.web;

import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.publicacoes.dominio.Publicacao;
import java.time.Instant;

/** Schema {@code PublicacaoResponse} do contrato. */
public record PublicacaoResponse(Long id, Long comunidadeId, AutorResumo autor, String conteudo, Instant criadoEm) {

    static PublicacaoResponse de(Publicacao publicacao, UsuarioResumo autor) {
        return new PublicacaoResponse(publicacao.id, publicacao.comunidadeId,
                AutorResumo.de(publicacao.autorUsuarioId, autor), publicacao.conteudo, publicacao.criadoEm);
    }
}
