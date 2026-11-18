package br.edu.unicatolica.pacext.compartilhado.auditoria;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class AuditoriaConsultaImpl implements AuditoriaConsulta {

    @Inject
    EntityManager entityManager;

    @Override
    public PageResponse<LogAuditoria> buscar(Filtro filtro, int pagina, int tamanho) {
        Map<String, Object> parametros = new LinkedHashMap<>();
        String condicoes = condicoes(filtro, parametros);

        TypedQuery<Long> contagem = entityManager.createQuery(
                "select count(l) from LogAuditoria l" + condicoes, Long.class);
        parametros.forEach(contagem::setParameter);
        long total = contagem.getSingleResult();
        if (total == 0) {
            return PageResponse.de(List.of(), pagina, tamanho, 0);
        }

        TypedQuery<LogAuditoria> consulta = entityManager.createQuery(
                "select l from LogAuditoria l" + condicoes + " order by l.criadoEm desc, l.id desc",
                LogAuditoria.class);
        parametros.forEach(consulta::setParameter);
        consulta.setFirstResult(pagina * tamanho);
        consulta.setMaxResults(tamanho);
        return PageResponse.de(consulta.getResultList(), pagina, tamanho, total);
    }

    @Override
    public Opcoes opcoes() {
        List<Object[]> pares = entityManager.createQuery(
                "select distinct l.modulo, l.acao from LogAuditoria l order by l.modulo, l.acao",
                Object[].class).getResultList();
        Map<String, List<String>> acoesPorModulo = new LinkedHashMap<>();
        for (Object[] par : pares) {
            acoesPorModulo.computeIfAbsent((String) par[0], modulo -> new ArrayList<>()).add((String) par[1]);
        }
        List<String> entidades = entityManager.createQuery(
                "select distinct l.entidadeAfetada from LogAuditoria l where l.entidadeAfetada is not null "
                        + "order by l.entidadeAfetada", String.class).getResultList();
        return new Opcoes(List.copyOf(acoesPorModulo.keySet()), acoesPorModulo, entidades);
    }

    private String condicoes(Filtro filtro, Map<String, Object> parametros) {
        List<String> partes = new ArrayList<>();
        if (filtro.modulo() != null) {
            partes.add("l.modulo = :modulo");
            parametros.put("modulo", filtro.modulo());
        }
        if (filtro.acao() != null) {
            partes.add("l.acao = :acao");
            parametros.put("acao", filtro.acao());
        }
        if (filtro.entidadeAfetada() != null) {
            partes.add("l.entidadeAfetada = :entidadeAfetada");
            parametros.put("entidadeAfetada", filtro.entidadeAfetada());
        }
        if (filtro.detalhes() != null) {
            // ilike (não lower(...) like): é o que o índice GIN de trigramas em "detalhes" atende.
            partes.add("l.detalhes ilike :detalhes escape '!'");
            parametros.put("detalhes", "%" + escaparLike(filtro.detalhes()) + "%");
        }
        if (filtro.de() != null) {
            partes.add("l.criadoEm >= :de");
            parametros.put("de", filtro.de());
        }
        if (filtro.ateExclusivo() != null) {
            partes.add("l.criadoEm < :ate");
            parametros.put("ate", filtro.ateExclusivo());
        }
        return partes.isEmpty() ? "" : " where " + String.join(" and ", partes);
    }

    /** O texto digitado é literal: {@code %} e {@code _} não viram curinga. */
    private static String escaparLike(String texto) {
        return texto.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
