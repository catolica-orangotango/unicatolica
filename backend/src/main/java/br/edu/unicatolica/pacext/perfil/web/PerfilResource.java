package br.edu.unicatolica.pacext.perfil.web;

import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.perfil.aplicacao.PerfilService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Endpoints do Épico 4 — Stories 4.1, 4.2, 4.4. */
@Path("/perfil")
public class PerfilResource {

    @Inject
    PerfilService perfilService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** Story 4.2 (RF20). */
    @GET
    @Path("/me")
    @Produces(MediaType.APPLICATION_JSON)
    public Response me() {
        return Response.ok(PerfilResponse.de(perfilService.buscarProprio(usuarioAutenticado.id()))).build();
    }

    /** Story 4.1 (RF14, RF15, RF16, RF17, RF18, RF19) — cria ou edita, mesma operação. */
    @PUT
    @Path("/me")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response salvar(PerfilRequest request) {
        var perfil = perfilService.salvar(usuarioAutenticado.id(), request.nome(), request.curso(),
                request.periodo(), request.interesses());
        return Response.ok(PerfilResponse.de(perfil)).build();
    }

    /** Story 4.4 (RF20.2) — perfil público de outro usuário, mesmos campos, só leitura. */
    @GET
    @Path("/{usuarioId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response porUsuarioId(@PathParam("usuarioId") Long usuarioId) {
        return Response.ok(PerfilResponse.de(perfilService.buscarPublico(usuarioId))).build();
    }
}
