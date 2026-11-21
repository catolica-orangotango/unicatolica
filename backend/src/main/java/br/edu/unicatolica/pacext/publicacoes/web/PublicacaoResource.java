package br.edu.unicatolica.pacext.publicacoes.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.midia.ArquivoAnexado;
import br.edu.unicatolica.pacext.midia.MidiaConsulta;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Endpoints do Epic 3 (Stories 3.1 e 3.2) — postagens de uma comunidade. */
@Path("/comunidades/{id}/publicacoes")
public class PublicacaoResource {

    @Inject
    PublicacaoService publicacaoService;

    @Inject
    UsuarioConsulta usuarioConsulta;

    @Inject
    MidiaConsulta midiaConsulta;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** Story 3.1 — cria postagem na comunidade (RF32–RF35). */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response criar(@PathParam("id") Long comunidadeId, PublicacaoRequest request) {
        Long autorId = usuarioAutenticado.id();
        Publicacao publicacao = publicacaoService.criar(autorId, comunidadeId,
                request == null ? null : request.conteudo(), request == null ? null : request.arquivoId());
        UsuarioResumo autor = usuarioConsulta.buscarResumos(List.of(autorId)).get(autorId);
        Map<Long, ArquivoAnexado> arquivos = resolverArquivos(List.of(publicacao), autor == null ? Map.of() : Map.of(autorId, autor));
        return Response.status(Response.Status.CREATED)
                .entity(montar(publicacao, autor, arquivos))
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
        Map<Long, ArquivoAnexado> arquivos = resolverArquivos(resultado.content(), autores);
        List<PublicacaoResponse> conteudo = resultado.content().stream()
                .map(p -> montar(p, autores.get(p.autorUsuarioId), arquivos))
                .toList();
        return new PageResponse<>(conteudo, resultado.page(), resultado.size(), resultado.totalElements(),
                resultado.totalPages());
    }

    /** Uma chamada só a {@code midia} por página: anexos das postagens e fotos dos autores juntos. */
    private Map<Long, ArquivoAnexado> resolverArquivos(List<Publicacao> publicacoes, Map<Long, UsuarioResumo> autores) {
        Set<Long> ids = new LinkedHashSet<>();
        publicacoes.stream().map(p -> p.arquivoId).filter(Objects::nonNull).forEach(ids::add);
        autores.values().stream().filter(Objects::nonNull).map(UsuarioResumo::fotoArquivoId).filter(Objects::nonNull)
                .forEach(ids::add);
        return ids.isEmpty() ? Map.of() : midiaConsulta.resolver(ids);
    }

    private static PublicacaoResponse montar(Publicacao publicacao, UsuarioResumo autor,
            Map<Long, ArquivoAnexado> arquivos) {
        ArquivoAnexado anexo = publicacao.arquivoId == null ? null : arquivos.get(publicacao.arquivoId);
        ArquivoAnexado foto = autor == null || autor.fotoArquivoId() == null ? null
                : arquivos.get(autor.fotoArquivoId());
        return PublicacaoResponse.de(publicacao, autor, anexo, foto);
    }
}
