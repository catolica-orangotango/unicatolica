package br.edu.unicatolica.pacext.publicacoes.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.publicacoes.aplicacao.PublicacaoService;
import br.edu.unicatolica.pacext.publicacoes.dominio.Publicacao;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;

/** Endpoints do Epic 3 (Stories 3.1 e 3.2) — postagens de uma comunidade. */
@Path("/comunidades/{id}/publicacoes")
public class PublicacaoResource {

    @Inject
    PublicacaoService publicacaoService;

    @Inject
    UsuarioConsulta usuarioConsulta;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** Story 3.1 — cria postagem na comunidade (RF32–RF35). */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response criar(@PathParam("id") Long comunidadeId, PublicacaoRequest request) {
        Long autorId = usuarioAutenticado.id();
        Publicacao publicacao = publicacaoService.criar(autorId, comunidadeId, request == null ? null : request.conteudo());
        UsuarioResumo autor = usuarioConsulta.buscarResumos(List.of(autorId)).get(autorId);
        return Response.status(Response.Status.CREATED)
                .entity(PublicacaoResponse.de(publicacao, autor))
                .build();
    }

    /** Story 3.2 — feed da comunidade, mais recente primeiro (RF36). Autores buscados em lote, sem N+1. */
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<PublicacaoResponse> listar(
            @PathParam("id") Long comunidadeId,
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        PageResponse<Publicacao> resultado = publicacaoService.listar(comunidadeId, pagina, tamanho);
        List<Long> autorIds = resultado.content().stream().map(p -> p.autorUsuarioId).distinct().toList();
        Map<Long, UsuarioResumo> autores = usuarioConsulta.buscarResumos(autorIds);
        List<PublicacaoResponse> conteudo = resultado.content().stream()
                .map(p -> PublicacaoResponse.de(p, autores.get(p.autorUsuarioId)))
                .toList();
        return new PageResponse<>(conteudo, resultado.page(), resultado.size(), resultado.totalElements(),
                resultado.totalPages());
    }
}
