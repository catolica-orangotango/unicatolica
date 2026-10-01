package br.edu.unicatolica.pacext.moderacao.aplicacao;

import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeravel;

/**
 * Denúncia com a postagem denunciada como está hoje (Story 12.4). {@code conteudo} é
 * {@code null} se a postagem não existir mais em Publicações.
 */
public record DenunciaEmAnalise(Denuncia denuncia, PublicacaoModeravel conteudo) {
}
