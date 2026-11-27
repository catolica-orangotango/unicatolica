package br.edu.unicatolica.pacext.avisos.web;

import br.edu.unicatolica.pacext.avisos.dominio.Aviso;
import br.edu.unicatolica.pacext.identidade.CursoConsulta;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Espelha {@code AvisoResponse} do {@code openapi.yaml}. */
public record AvisoResponse(Long id, String titulo, String mensagem, String escopo, Long cursoId, String cursoNome,
        LocalDate dataDestaque, Instant criadoEm) {

    public static AvisoResponse de(Aviso aviso, String cursoNome) {
        return new AvisoResponse(aviso.id, aviso.titulo, aviso.mensagem, aviso.escopo.name(), aviso.cursoId,
                cursoNome, aviso.dataDestaque, aviso.criadoEm);
    }

    /** Monta a lista com uma chamada só a {@code identidade} para o nome dos cursos dos escopos. */
    public static List<AvisoResponse> de(List<Aviso> avisos, CursoConsulta cursoConsulta) {
        List<Long> ids = avisos.stream().map(a -> a.cursoId).filter(Objects::nonNull).distinct().toList();
        // Map.of().get(null) lança NPE: o aviso GERAL não tem curso.
        Map<Long, String> nomes = ids.isEmpty() ? Map.of() : cursoConsulta.nomes(ids);
        return avisos.stream().map(a -> de(a, a.cursoId == null ? null : nomes.get(a.cursoId))).toList();
    }
}
