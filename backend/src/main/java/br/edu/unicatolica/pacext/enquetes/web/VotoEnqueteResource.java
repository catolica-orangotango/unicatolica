package br.edu.unicatolica.pacext.enquetes.web;

import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.enquetes.aplicacao.EnqueteService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Story 8.3 — o voto do usuário autenticado numa enquete (RF55–RF57). A resposta não traz nada além de
 * "registrado": nenhum endpoint devolve em quem o usuário votou (RF57.1).
 */
@Path("/enquetes/{id}/votos")
public class VotoEnqueteResource {

    @Inject
    EnqueteService enqueteService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response votar(@PathParam("id") Long enqueteId, VotoRequest request) {
        enqueteService.votar(usuarioAutenticado.id(), enqueteId, request == null ? null : request.opcaoIds());
        return Response.noContent().build();
    }
}
