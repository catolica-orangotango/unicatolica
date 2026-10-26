package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.aplicacao.CursoService;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

/**
 * {@code GET /cursos} — lista do select do cadastro e do perfil. Rota pública só para
 * leitura (allowlist do {@code JwtSecurityFilter}, AD-2): a tela de cadastro precisa dela
 * antes do login. {@code POST /cursos} e {@code PUT /cursos/{id}} exigem token de
 * administrador (KAN-44); a autorização é decidida em {@link CursoService}.
 */
@Path("/cursos")
public class CursoResource {

    @Inject
    CursoService cursoService;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<CursoResponse> listar() {
        return cursoService.listarAtivos().stream().map(CursoResponse::de).toList();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response cadastrar(@Valid CursoRequest request) {
        return Response.status(Response.Status.CREATED)
                .entity(CursoAdminResponse.de(cursoService.cadastrar(request.nome())))
                .build();
    }

    @PUT
    @Path("/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public CursoAdminResponse atualizar(@PathParam("id") Long id, @Valid CursoAtualizacaoRequest request) {
        return CursoAdminResponse.de(cursoService.atualizar(id, request.nome(), request.ativo()));
    }
}
