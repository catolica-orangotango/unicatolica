package br.edu.unicatolica.pacext.moderacao.web;

import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.moderacao.aplicacao.DenunciaService;
import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Story 12.1 — qualquer usuário autenticado denuncia um conteúdo (RF75, RF76). */
@Path("/denuncias")
public class DenunciaResource {

    @Inject
    DenunciaService denunciaService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response denunciar(DenunciaRequest request) {
        DenunciaRequest corpo = request == null ? new DenunciaRequest(null, null, null) : request;
        Denuncia denuncia = denunciaService.registrar(usuarioAutenticado.id(), corpo.tipoConteudo(), corpo.conteudoId(),
                corpo.motivo());
        return Response.status(Response.Status.CREATED)
                .entity(DenunciaRegistradaResponse.de(denuncia))
                .build();
    }
}
