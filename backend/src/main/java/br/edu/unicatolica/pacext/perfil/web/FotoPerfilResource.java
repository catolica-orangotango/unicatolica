package br.edu.unicatolica.pacext.perfil.web;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.perfil.aplicacao.PerfilService;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/** {@code /perfil/me/foto} — foto de perfil do usuário autenticado (KAN-128). */
@Path("/perfil/me/foto")
public class FotoPerfilResource {

    @Inject
    PerfilService perfilService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public PerfilResponse definir(FotoPerfilRequest request) {
        if (request == null) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe o arquivo da foto.", "arquivoId");
        }
        return PerfilResponse.de(perfilService.definirFoto(usuarioAutenticado.id(), request.arquivoId()));
    }

    @DELETE
    @Produces(MediaType.APPLICATION_JSON)
    public PerfilResponse remover() {
        return PerfilResponse.de(perfilService.removerFoto(usuarioAutenticado.id()));
    }
}
