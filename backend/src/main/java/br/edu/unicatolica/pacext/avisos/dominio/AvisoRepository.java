package br.edu.unicatolica.pacext.avisos.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Repository do módulo Avisos — único ponto de acesso à tabela {@code aviso} (AD-3). */
@ApplicationScoped
public class AvisoRepository implements PanacheRepository<Aviso> {

    /** Mais recente primeiro; o id desempata avisos do mesmo instante. */
    public List<Aviso> listarRecentes(int pagina, int tamanho) {
        return find("order by criadoEm desc, id desc").page(Page.of(pagina, tamanho)).list();
    }

    /**
     * Avisos que valem agora para quem é do curso {@code cursoId} (nulo = sem curso: só os gerais),
     * RF82: os gerais e os do curso dele; com {@code dataDestaque}, até o fim desse dia; sem data,
     * publicados depois de {@code semDataDesde}. Mais recente primeiro.
     */
    public List<Aviso> listarVisiveis(Long cursoId, LocalDate hoje, Instant semDataDesde, int limite) {
        String vigencia = "((dataDestaque is not null and dataDestaque >= ?2) or (dataDestaque is null and criadoEm >= ?3))";
        String ordem = " order by criadoEm desc, id desc";
        if (cursoId == null) {
            return find("escopo = ?1 and " + vigencia + ordem, EscopoAviso.GERAL, hoje, semDataDesde)
                    .page(Page.ofSize(limite)).list();
        }
        return find("(escopo = ?1 or (escopo = ?4 and cursoId = ?5)) and " + vigencia + ordem,
                EscopoAviso.GERAL, hoje, semDataDesde, EscopoAviso.CURSO, cursoId)
                .page(Page.ofSize(limite)).list();
    }
}
