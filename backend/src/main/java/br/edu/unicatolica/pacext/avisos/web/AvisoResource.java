package br.edu.unicatolica.pacext.avisos.web;

import br.edu.unicatolica.pacext.avisos.aplicacao.AvisoService;
import br.edu.unicatolica.pacext.identidade.CursoConsulta;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

/** Story 13.2 — avisos institucionais do Início do usuário ({@code GET /avisos}). */
@Path("/avisos")
public class AvisoResource {

    @Inject
    AvisoService avisoService;

    @Inject
    CursoConsulta cursoConsulta;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<AvisoResponse> listarDoInicio() {
        return AvisoResponse.de(avisoService.listarDoInicio(), cursoConsulta);
    }
}
