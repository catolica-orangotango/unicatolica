package br.edu.unicatolica.pacext.moderacao.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

/** Repository do módulo Moderação — único ponto de acesso à tabela {@code denuncia} (AD-3). */
@ApplicationScoped
public class DenunciaRepository implements PanacheRepository<Denuncia> {

    /** Barra a mesma pessoa denunciando o mesmo conteúdo duas vezes (Story 12.1). */
    public boolean existeDenuncia(TipoConteudo tipoConteudo, Long conteudoId, Long denuncianteUsuarioId) {
        return count("tipoConteudo = ?1 and conteudoId = ?2 and denuncianteUsuarioId = ?3",
                tipoConteudo, conteudoId, denuncianteUsuarioId) > 0;
    }

    /** Fila geral (Story 12.4, RF77) — pendentes, mais antiga primeiro. Escalonadas não entram (RF80.2). */
    public List<Denuncia> listarPendentes(int pagina, int tamanho) {
        return find("situacao = ?1 order by criadoEm, id", SituacaoDenuncia.PENDENTE)
                .page(Page.of(pagina, tamanho))
                .list();
    }

    public long contarPendentes() {
        return count("situacao = ?1", SituacaoDenuncia.PENDENTE);
    }

    /** Fila do moderador neutro (Story 12.8, RF80.1). */
    public List<Denuncia> listarEscalonadasPara(Long moderadorNeutroUsuarioId) {
        return list("situacao = ?1 and moderadorNeutroUsuarioId = ?2 order by escalonadaEm, id",
                SituacaoDenuncia.ESCALONADA, moderadorNeutroUsuarioId);
    }
}
