package br.edu.unicatolica.pacext.avisos.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

/** Repository do módulo Avisos — único ponto de acesso à tabela {@code aviso} (AD-3). */
@ApplicationScoped
public class AvisoRepository implements PanacheRepository<Aviso> {

    /** Mais recente primeiro; o id desempata avisos do mesmo instante. */
    public List<Aviso> listarRecentes(int pagina, int tamanho) {
        return find("order by criadoEm desc, id desc").page(Page.of(pagina, tamanho)).list();
    }
}
