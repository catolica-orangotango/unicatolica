package br.edu.unicatolica.pacext.avisos.web;

import br.edu.unicatolica.pacext.avisos.aplicacao.AvisoService;
import br.edu.unicatolica.pacext.avisos.dominio.Aviso;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.identidade.CursoConsulta;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

/** Story 13.1 — publicação e lista de avisos institucionais; a autorização é decidida em {@link AvisoService}. */
@Path("/admin/avisos")
public class AvisoAdminResource {

    @Inject
    AvisoService avisoService;

    @Inject
    CursoConsulta cursoConsulta;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response publicar(AvisoRequest request) {
        AvisoRequest corpo = request == null ? new AvisoRequest(null, null, null, null, null) : request;
        Aviso aviso = avisoService.publicar(corpo.titulo(), corpo.mensagem(), corpo.escopo(), corpo.cursoId(),
                corpo.dataDestaque());
        return Response.status(Response.Status.CREATED)
                .entity(AvisoResponse.de(List.of(aviso), cursoConsulta).get(0))
                .build();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<AvisoResponse> listar(
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        PageResponse<Aviso> resultado = avisoService.listar(pagina, tamanho);
        return new PageResponse<>(AvisoResponse.de(resultado.content(), cursoConsulta), resultado.page(), resultado.size(), resultado.totalElements(),
                resultado.totalPages());
    }
}
