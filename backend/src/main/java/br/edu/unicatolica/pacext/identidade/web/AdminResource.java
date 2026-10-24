package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.aplicacao.AdminService;
import br.edu.unicatolica.pacext.identidade.aplicacao.CursoService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

/** Rota base da área de administração; a autorização é decidida em {@link AdminService}. */
@Path("/admin")
public class AdminResource {

    @Inject
    AdminService adminService;

    @Inject
    CursoService cursoService;

    /** Base da tela "Cursos" (KAN-44): todos os cursos, com os desativados. Só ADMINISTRADOR. */
    @GET
    @Path("/cursos")
    @Produces(MediaType.APPLICATION_JSON)
    public List<CursoAdminResponse> cursos() {
        return cursoService.listarTodos().stream().map(CursoAdminResponse::de).toList();
    }

    @GET
    @Path("/painel")
    @Produces(MediaType.APPLICATION_JSON)
    public Response painel() {
        return Response.ok(new PainelAdminResponse(adminService.painel())).build();
    }
}
