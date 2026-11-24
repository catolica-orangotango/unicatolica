package br.edu.unicatolica.pacext.enquetes.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Repository de {@code enquete_participacao} — quem votou em quê enquete, sem a opção (AD-3). */
@ApplicationScoped
public class EnqueteParticipacaoRepository implements PanacheRepository<EnqueteParticipacao> {

    public boolean jaVotou(Long enqueteId, Long usuarioId) {
        return count("enqueteId = ?1 and usuarioId = ?2", enqueteId, usuarioId) > 0;
    }

    /** Das enquetes dadas, as em que o usuário já votou — uma consulta para a página inteira. */
    public Set<Long> enquetesVotadas(Long usuarioId, Collection<Long> enqueteIds) {
        if (enqueteIds.isEmpty()) {
            return Set.of();
        }
        List<EnqueteParticipacao> participacoes = list("usuarioId = ?1 and enqueteId in ?2", usuarioId, enqueteIds);
        return participacoes.stream().map(p -> p.enqueteId).collect(Collectors.toSet());
    }

    /** Quantas pessoas votaram em cada enquete dada — uma consulta para a página inteira. */
    public Map<Long, Integer> totalPorEnquete(Collection<Long> enqueteIds) {
        if (enqueteIds.isEmpty()) {
            return Map.of();
        }
        List<Object[]> linhas = getEntityManager()
                .createQuery("select p.enqueteId, count(p) from EnqueteParticipacao p where p.enqueteId in :ids group by p.enqueteId",
                        Object[].class)
                .setParameter("ids", enqueteIds)
                .getResultList();
        return linhas.stream().collect(Collectors.toMap(l -> (Long) l[0], l -> ((Long) l[1]).intValue()));
    }
}
