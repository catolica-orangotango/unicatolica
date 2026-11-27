package br.edu.unicatolica.pacext.publicacoes.web;

import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.publicacoes.aplicacao.PublicacaoService;
import jakarta.inject.Inject;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Response;

/** KAN-137 — exclusão da própria postagem ({@code DELETE /publicacoes/{id}}). */
@Path("/publicacoes/{id}")
public class PublicacaoExclusaoResource {

    @Inject
    PublicacaoService publicacaoService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @DELETE
    public Response excluir(@PathParam("id") Long id) {
        publicacaoService.excluir(usuarioAutenticado.id(), id);
        return Response.noContent().build();
    }
}
