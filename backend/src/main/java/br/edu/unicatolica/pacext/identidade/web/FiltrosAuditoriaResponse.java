package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaConsulta;
import java.util.List;
import java.util.Map;

/** Corpo de {@code GET /admin/auditoria/filtros} (KAN-90): opções das listas de seleção. */
public record FiltrosAuditoriaResponse(List<String> modulos, Map<String, List<String>> acoesPorModulo,
        List<String> entidadesAfetadas) {

    public static FiltrosAuditoriaResponse de(AuditoriaConsulta.Opcoes opcoes) {
        return new FiltrosAuditoriaResponse(opcoes.modulos(), opcoes.acoesPorModulo(), opcoes.entidadesAfetadas());
    }
}
