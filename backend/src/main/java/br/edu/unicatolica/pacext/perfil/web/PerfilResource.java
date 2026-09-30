package br.edu.unicatolica.pacext.perfil.web;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.perfil.aplicacao.PerfilService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/** {@code /perfil/me} — Stories 4.1 (criar/editar) e 4.2 (consultar o próprio perfil). */
@Path("/perfil/me")
public class PerfilResource {

    @Inject
    PerfilService perfilService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PerfilResponse obter() {
        return PerfilResponse.de(perfilService.obter(usuarioAutenticado.id()));
    }

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public PerfilResponse salvar(PerfilRequest request) {
        if (request == null) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Envie os dados do perfil.", null);
        }
        return PerfilResponse.de(perfilService.salvar(usuarioAutenticado.id(), request.nome(), request.cursoId(),
                request.periodo(), request.interesses()));
    }
}
