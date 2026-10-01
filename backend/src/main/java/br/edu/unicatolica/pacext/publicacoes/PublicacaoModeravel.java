package br.edu.unicatolica.pacext.publicacoes;

import java.time.Instant;

/** Postagem como a Moderação a enxerga (Stories 12.1, 12.4 e 12.5). */
public record PublicacaoModeravel(Long id, Long comunidadeId, Long autorUsuarioId, String conteudo,
        Instant criadoEm, boolean oculta) {
}
