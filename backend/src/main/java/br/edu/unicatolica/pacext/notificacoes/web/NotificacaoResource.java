package br.edu.unicatolica.pacext.notificacoes.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.notificacoes.aplicacao.NotificacaoService;
import br.edu.unicatolica.pacext.notificacoes.dominio.Notificacao;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Story 10.1 — sininho de notificações da shell (RF20.1). */
@Path("/notificacoes")
public class NotificacaoResource {

    @Inject
    NotificacaoService notificacaoService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @GET
    @Path("/me")
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<NotificacaoResponse> minhas(
            @QueryParam("pagina") @jakarta.ws.rs.DefaultValue("0") int pagina,
            @QueryParam("tamanho") @jakarta.ws.rs.DefaultValue("20") int tamanho) {
        PageResponse<Notificacao> pagina1 = notificacaoService.listar(usuarioAutenticado.id(), pagina, tamanho);
        return new PageResponse<>(pagina1.content().stream().map(NotificacaoResponse::de).toList(), pagina1.page(),
                pagina1.size(), pagina1.totalElements(), pagina1.totalPages());
    }

    @POST
    @Path("/{id}/lida")
    public Response marcarComoLida(@PathParam("id") Long id) {
        notificacaoService.marcarComoLida(usuarioAutenticado.id(), id);
        return Response.noContent().build();
    }
}
