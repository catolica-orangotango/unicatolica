package br.edu.unicatolica.pacext.avisos.web;

import br.edu.unicatolica.pacext.avisos.dominio.Aviso;
import java.time.Instant;
import java.time.LocalDate;

/** Espelha {@code AvisoResponse} do {@code openapi.yaml}. */
public record AvisoResponse(Long id, String titulo, String mensagem, String escopo, Long cursoId, String cursoNome,
        LocalDate dataDestaque, Instant criadoEm) {

    public static AvisoResponse de(Aviso aviso, String cursoNome) {
        return new AvisoResponse(aviso.id, aviso.titulo, aviso.mensagem, aviso.escopo.name(), aviso.cursoId,
                cursoNome, aviso.dataDestaque, aviso.criadoEm);
    }
}
