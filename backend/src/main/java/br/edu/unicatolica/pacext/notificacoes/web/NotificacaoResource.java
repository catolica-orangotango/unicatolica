package br.edu.unicatolica.pacext.notificacoes.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.notificacoes.aplicacao.NotificacaoService;
import br.edu.unicatolica.pacext.notificacoes.dominio.Notificacao;
import jakarta.inject.Inject;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Story 10.1/10.2 — sininho de notificações da shell (RF20.1, RF68, RF69, RF84). */
@Path("/notificacoes")
public class NotificacaoResource {

    @Inject
    NotificacaoService notificacaoService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @GET
    @Path("/me")
    @Produces(MediaType.APPLICATION_JSON)
    public NotificacaoPageResponse minhas(
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        PageResponse<Notificacao> pagina1 = notificacaoService.listar(usuarioAutenticado.id(), pagina, tamanho);
        long totalNaoLidas = notificacaoService.contarNaoLidas(usuarioAutenticado.id());
        return NotificacaoPageResponse.de(pagina1, totalNaoLidas);
    }

    @GET
    @Path("/me/resumo")
    @Produces(MediaType.APPLICATION_JSON)
    public NotificacaoResumoResponse resumo() {
        return NotificacaoResumoResponse.de(notificacaoService.resumo(usuarioAutenticado.id()));
    }

    @POST
    @Path("/{id}/lida")
    public Response marcarComoLida(@PathParam("id") Long id) {
        notificacaoService.marcarComoLida(usuarioAutenticado.id(), id);
        return Response.noContent().build();
    }

    @POST
    @Path("/me/lidas")
    public Response marcarTodasComoLidas() {
        notificacaoService.marcarTodasComoLidas(usuarioAutenticado.id());
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{id}")
    public Response excluir(@PathParam("id") Long id) {
        notificacaoService.excluir(usuarioAutenticado.id(), id);
        return Response.noContent().build();
    }
}
