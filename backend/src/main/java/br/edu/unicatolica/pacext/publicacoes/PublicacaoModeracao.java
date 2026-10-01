package br.edu.unicatolica.pacext.publicacoes;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * Leitura e mudança de situação de postagens pela Moderação (API pública de Publicações,
 * AD-3). A Moderação guarda só o id da postagem e oculta/restaura por aqui — nunca
 * escrevendo em {@code publicacao}.
 */
public interface PublicacaoModeracao {

    Optional<PublicacaoModeravel> buscar(Long publicacaoId);

    /**
     * Consulta em lote, para a fila de denúncias não gerar uma consulta por item (N+1).
     *
     * @return postagem de cada id encontrado, indexada pelo id; ids inexistentes ficam de fora.
     */
    Map<Long, PublicacaoModeravel> buscar(Collection<Long> publicacaoIds);

    /** RF78 — tira a postagem do feed, preservando-a. Sem efeito se ela não existir. */
    void ocultar(Long publicacaoId);

    /** RF78.1 — devolve a postagem ao feed. Sem efeito se ela não existir. */
    void restaurar(Long publicacaoId);
}
