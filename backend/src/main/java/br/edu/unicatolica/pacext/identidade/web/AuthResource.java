package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.aplicacao.AuthService;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Endpoint público de login (RF06/RF07) — allowlisted em {@code JwtSecurityFilter} (AD-2). */
@Path("/auth")
public class AuthResource {

    @Inject
    AuthService authService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @POST
    @Path("/login")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response login(LoginRequest request) {
        String token = authService.autenticar(request.email(), request.senha());
        return Response.ok(new LoginResponse(token)).build();
    }

    /**
     * Renova a sessão (KAN-78) — exige token válido, como o logout. Devolve um token novo
     * com o prazo de inatividade contado a partir de agora.
     */
    @POST
    @Path("/refresh")
    @Produces(MediaType.APPLICATION_JSON)
    public Response refresh() {
        String token = authService.renovar(usuarioAutenticado.id());
        return Response.ok(new LoginResponse(token)).build();
    }

    /**
     * Logout (Story 1.6, RF10/RF11) — exige token válido (não entra na allowlist do
     * {@code JwtSecurityFilter}) para saber qual usuário deslogar.
     */
    @POST
    @Path("/logout")
    public Response logout() {
        authService.logout(usuarioAutenticado.id());
        return Response.noContent().build();
    }
}
