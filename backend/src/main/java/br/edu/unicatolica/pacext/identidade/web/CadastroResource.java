package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.aplicacao.CadastroService;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * {@code POST /auth/registro} — Story 1.2. Rota pública (allowlist do {@code JwtSecurityFilter}, AD-2).
 */
@Path("/auth/registro")
public class CadastroResource {

    @Inject
    CadastroService cadastroService;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response registrar(@Valid CadastroRequest request) {
        Usuario usuario = cadastroService.cadastrar(request.nome(), request.email(), request.senha(),
                request.cursoId(), request.dataNascimento());
        return Response.status(Response.Status.CREATED).entity(CadastroResponse.de(usuario)).build();
    }
}
