package br.edu.unicatolica.pacext.enquetes.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.enquetes.aplicacao.EnqueteService;
import br.edu.unicatolica.pacext.enquetes.dominio.Enquete;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

/** Endpoints da Story 8.1 (Epic 8) — enquetes de uma comunidade. */
@Path("/comunidades/{id}/enquetes")
public class EnqueteResource {

    @Inject
    EnqueteService enqueteService;

    @Inject
    UsuarioConsulta usuarioConsulta;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** Story 8.1 — cria enquete na comunidade (RF53.1, RF53.3, RF54). */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response criar(@PathParam("id") Long comunidadeId, EnqueteRequest request) {
        Long autorId = usuarioAutenticado.id();
        Enquete enquete = request == null
                ? enqueteService.criar(autorId, comunidadeId, null, null, null, null)
                : enqueteService.criar(autorId, comunidadeId, request.pergunta(), request.tipo(),
                        request.limiteSelecao(), request.opcoes());
        UsuarioResumo autor = usuarioConsulta.buscarResumos(List.of(autorId)).get(autorId);
        return Response.status(Response.Status.CREATED).entity(EnqueteResponse.de(enquete, autor)).build();
    }

    /** Enquetes da comunidade, mais recente primeiro. */
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<EnqueteResponse> listar(
            @PathParam("id") Long comunidadeId,
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        return EnqueteResponse.pagina(enqueteService.listarDaComunidade(comunidadeId, pagina, tamanho), usuarioConsulta);
    }
}
