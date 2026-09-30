package br.edu.unicatolica.pacext.perfil.web;

import br.edu.unicatolica.pacext.perfil.aplicacao.PerfilService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * {@code GET /usuarios/{id}/perfil} — Story 4.4 (RF20.2): perfil de outro usuário, somente
 * leitura, para qualquer autenticado. 404 se o usuário não existe.
 */
@Path("/usuarios/{id}/perfil")
public class PerfilPublicoResource {

    @Inject
    PerfilService perfilService;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PerfilResponse obter(@PathParam("id") Long usuarioId) {
        return PerfilResponse.de(perfilService.obter(usuarioId));
    }
}
