package br.edu.unicatolica.pacext.enquetes.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

/** Repository do módulo Enquetes — único ponto de acesso às tabelas {@code enquete} e {@code enquete_opcao} (AD-3). */
@ApplicationScoped
public class EnqueteRepository implements PanacheRepository<Enquete> {

    /** Enquetes da comunidade — mais recente primeiro; o id desempata enquetes do mesmo instante. */
    public List<Enquete> listarPorComunidade(Long comunidadeId, int pagina, int tamanho) {
        return find("comunidadeId = ?1 order by criadaEm desc, id desc", comunidadeId)
                .page(Page.of(pagina, tamanho))
                .list();
    }

    public long contarPorComunidade(Long comunidadeId) {
        return count("comunidadeId", comunidadeId);
    }

    /** Base do limite de duas ativas por autor e comunidade (RF53.3). */
    public long contarAtivasDoAutorNaComunidade(Long autorId, Long comunidadeId) {
        return count("autorUsuarioId = ?1 and comunidadeId = ?2 and situacao = ?3",
                autorId, comunidadeId, SituacaoEnquete.ATIVA);
    }

    public List<Enquete> listarAtivasDoAutor(Long autorId, int pagina, int tamanho) {
        return find("autorUsuarioId = ?1 and situacao = ?2 order by criadaEm desc, id desc",
                autorId, SituacaoEnquete.ATIVA)
                .page(Page.of(pagina, tamanho))
                .list();
    }

    public long contarAtivasDoAutor(Long autorId) {
        return count("autorUsuarioId = ?1 and situacao = ?2", autorId, SituacaoEnquete.ATIVA);
    }
}
