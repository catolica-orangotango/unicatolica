package br.edu.unicatolica.pacext.publicacoes.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;

/** Repository do módulo Publicações — único ponto de acesso à tabela {@code publicacao} (AD-3). */
@ApplicationScoped
public class PublicacaoRepository implements PanacheRepository<Publicacao> {

    /**
     * Feed da comunidade (Story 3.2, RF36) — mais recente primeiro; id desempata posts do mesmo
     * instante. Postagem oculta fica de fora (RF78).
     */
    public List<Publicacao> listarPorComunidade(Long comunidadeId, int pagina, int tamanho) {
        return find("comunidadeId = ?1 and situacao = ?2 order by criadoEm desc, id desc",
                comunidadeId, SituacaoPublicacao.VISIVEL)
                .page(Page.of(pagina, tamanho))
                .list();
    }

    public long contarPorComunidade(Long comunidadeId) {
        return count("comunidadeId = ?1 and situacao = ?2", comunidadeId, SituacaoPublicacao.VISIVEL);
    }

    public List<Publicacao> buscarPorIds(Collection<Long> ids) {
        return list("id in ?1", ids);
    }
}
