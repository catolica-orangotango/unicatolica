package br.edu.unicatolica.pacext.comunidades.web;

import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import br.edu.unicatolica.pacext.comunidades.aplicacao.ComunidadeService;
import br.edu.unicatolica.pacext.comunidades.dominio.TipoComunidade;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import jakarta.inject.Inject;
import java.util.List;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Endpoints do Epic 2 (Stories 2.2, 2.4, 2.5) — entrada rápida desta fatia (ver
 * docs/decisoes/2026-08-modelo-epico-2-comunidades.md); Stories 2.1 (endpoint de admin) e 2.6
 * (administração) ficam de fora, bloqueadas pelo papel ADMINISTRADOR de plataforma.
 */
@Path("/comunidades")
public class ComunidadeResource {

    @Inject
    ComunidadeService comunidadeService;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    /** Story 2.2 — cria comunidade aberta; criador vira administrador dela (RF21, RF22, RF23). */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response criar(ComunidadeRequest request) {
        Comunidade comunidade = comunidadeService.criarComunidadeAberta(usuarioAutenticado.id(), request.nome(),
                request.descricao());
        return Response.status(Response.Status.CREATED)
                .entity(ComunidadeResponse.de(comunidade, true))
                .build();
    }

    /** Story 2.5 — listagem paginada com filtro por tipo/nome (RF27, RF28). */
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<ComunidadeResponse> listar(
            @QueryParam("tipo") String tipoParam,
            @QueryParam("nome") String nome,
            @QueryParam("pagina") @jakarta.ws.rs.DefaultValue("0") int pagina,
            @QueryParam("tamanho") @jakarta.ws.rs.DefaultValue("20") int tamanho) {
        TipoComunidade tipo = parseTipo(tipoParam);
        PageResponse<Comunidade> pagina1 = comunidadeService.listar(tipo, nome, pagina, tamanho);
        return new PageResponse<>(pagina1.content().stream().map(ComunidadeResponse::de).toList(), pagina1.page(),
                pagina1.size(), pagina1.totalElements(), pagina1.totalPages());
    }

    /**
     * Home ("Suas comunidades" na barra lateral) — precisa vir antes de {@code /{id}} no
     * matching do JAX-RS (segmento literal tem precedência sobre template, mas deixar
     * explícito evita surpresa se algum dia {@code id} deixar de ser {@code Long}).
     */
    @GET
    @Path("/minhas")
    @Produces(MediaType.APPLICATION_JSON)
    public List<ComunidadeResponse> minhas() {
        return comunidadeService.minhasComunidades(usuarioAutenticado.id()).stream()
                .map(comunidade -> ComunidadeResponse.de(comunidade, true))
                .toList();
    }

    /**
     * Story 2.5 — detalhe de uma comunidade, incluindo {@code souMembro} (RF27.1) pra o
     * frontend decidir se mostra a caixa de postar/comentar/votar ou o aviso de não-membro.
     */
    @GET
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public ComunidadeResponse obter(@PathParam("id") Long id) {
        Comunidade comunidade = comunidadeService.buscarOuFalhar(id);
        boolean souMembro = comunidadeService.souMembro(comunidade, usuarioAutenticado.id());
        return ComunidadeResponse.de(comunidade, souMembro);
    }

    /** Story 2.4 — entrar numa comunidade aberta (RF24, RF25). */
    @POST
    @Path("/{id}/membros")
    public Response ingressar(@PathParam("id") Long id) {
        comunidadeService.ingressar(usuarioAutenticado.id(), id);
        return Response.status(Response.Status.CREATED).build();
    }

    /** Story 2.4 — sair de uma comunidade (RF26). */
    @DELETE
    @Path("/{id}/membros/me")
    public Response sair(@PathParam("id") Long id) {
        comunidadeService.sair(usuarioAutenticado.id(), id);
        return Response.noContent().build();
    }

    private TipoComunidade parseTipo(String tipoParam) {
        if (tipoParam == null || tipoParam.isBlank()) {
            return null;
        }
        try {
            return TipoComunidade.valueOf(tipoParam.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.validacao("TIPO_INVALIDO", "Tipo de comunidade inválido.", "tipo deve ser CURSO ou ABERTA");
        }
    }
}
