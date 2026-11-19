package br.edu.unicatolica.pacext.enquetes.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Repository de {@code enquete_voto} — só opções escolhidas, sem identidade (RF57.1). */
@ApplicationScoped
public class EnqueteVotoRepository implements PanacheRepository<EnqueteVoto> {

    /** Votos por opção, só das opções dadas; opção sem voto não aparece no mapa. */
    public Map<Long, Integer> contagemPorOpcao(Collection<Long> opcaoIds) {
        if (opcaoIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> linhas = getEntityManager()
                .createQuery("select v.opcaoId, count(v) from EnqueteVoto v where v.opcaoId in :ids group by v.opcaoId",
                        Object[].class)
                .setParameter("ids", opcaoIds)
                .getResultList();
        return linhas.stream().collect(Collectors.toMap(l -> (Long) l[0], l -> ((Long) l[1]).intValue()));
    }
}
