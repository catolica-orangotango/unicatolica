package br.edu.unicatolica.pacext.moderacao.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.moderacao.aplicacao.DenunciaEmAnalise;
import br.edu.unicatolica.pacext.moderacao.aplicacao.ModeracaoService;
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
import java.util.List;
import java.util.Map;

/** Stories 12.4 e 12.5 — fila do moderador e ações sobre a denúncia. Só perfil MODERADOR. */
@Path("/moderacao/denuncias")
@Produces(MediaType.APPLICATION_JSON)
public class ModeracaoResource {

    @Inject
    ModeracaoService moderacaoService;

    @Inject
    UsuarioConsulta usuarioConsulta;

    /** Story 12.4 (RF77) — mais antiga primeiro. Autores buscados em lote, sem N+1. */
    @GET
    public PageResponse<DenunciaResponse> listar(
            @QueryParam("situacao") String situacao,
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        PageResponse<DenunciaEmAnalise> resultado = moderacaoService.listar(situacao, pagina, tamanho);
        List<Long> autorIds = resultado.content().stream()
                .map(a -> a.denuncia().autorConteudoUsuarioId).distinct().toList();
        Map<Long, UsuarioResumo> autores = usuarioConsulta.buscarResumos(autorIds);
        List<DenunciaResponse> conteudo = resultado.content().stream()
                .map(a -> DenunciaResponse.de(a, autores.get(a.denuncia().autorConteudoUsuarioId)))
                .toList();
        return new PageResponse<>(conteudo, resultado.page(), resultado.size(), resultado.totalElements(),
                resultado.totalPages());
    }

    /** Story 12.4 (RF77.1) — tela de análise. */
    @GET
    @Path("/{id}")
    public DenunciaResponse obter(@PathParam("id") Long id) {
        return resposta(moderacaoService.obter(id));
    }

    /** Story 12.5 (RF78). */
    @POST
    @Path("/{id}/ocultacao")
    @Consumes(MediaType.APPLICATION_JSON)
    public DenunciaResponse ocultar(@PathParam("id") Long id, OcultacaoRequest request) {
        return resposta(moderacaoService.ocultar(id, request == null ? null : request.motivo()));
    }

    /** Story 12.5 (RF78.1) — sem corpo. */
    @POST
    @Path("/{id}/restauracao")
    public DenunciaResponse restaurar(@PathParam("id") Long id) {
        return resposta(moderacaoService.restaurar(id));
    }

    /** Com corpo JSON (motivo opcional, só para o histórico). */
    @POST
    @Path("/{id}/descarte")
    @Consumes(MediaType.APPLICATION_JSON)
    public DenunciaResponse descartar(@PathParam("id") Long id, DescarteRequest request) {
        return resposta(moderacaoService.descartar(id, request == null ? null : request.motivo()));
    }

    /** Sem corpo nem Content-Type — o contrato deixa o corpo do descarte opcional. */
    @POST
    @Path("/{id}/descarte")
    public DenunciaResponse descartarSemCorpo(@PathParam("id") Long id) {
        return resposta(moderacaoService.descartar(id, null));
    }

    private DenunciaResponse resposta(DenunciaEmAnalise analise) {
        Long autorId = analise.denuncia().autorConteudoUsuarioId;
        return DenunciaResponse.de(analise, usuarioConsulta.buscarResumos(List.of(autorId)).get(autorId));
    }
}
