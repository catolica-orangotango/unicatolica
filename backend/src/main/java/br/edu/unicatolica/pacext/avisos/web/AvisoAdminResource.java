package br.edu.unicatolica.pacext.avisos.web;

import br.edu.unicatolica.pacext.avisos.aplicacao.AvisoService;
import br.edu.unicatolica.pacext.avisos.dominio.Aviso;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.identidade.CursoConsulta;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Story 13.1 — publicação e lista de avisos institucionais; a autorização é decidida em {@link AvisoService}. */
@Path("/admin/avisos")
public class AvisoAdminResource {

    @Inject
    AvisoService avisoService;

    @Inject
    CursoConsulta cursoConsulta;

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response publicar(AvisoRequest request) {
        AvisoRequest corpo = request == null ? new AvisoRequest(null, null, null, null, null) : request;
        Aviso aviso = avisoService.publicar(corpo.titulo(), corpo.mensagem(), corpo.escopo(), corpo.cursoId(),
                corpo.dataDestaque());
        Map<Long, String> nomes = nomesDosCursos(List.of(aviso));
        return Response.status(Response.Status.CREATED)
                .entity(AvisoResponse.de(aviso, nomeDo(nomes, aviso)))
                .build();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<AvisoResponse> listar(
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        PageResponse<Aviso> resultado = avisoService.listar(pagina, tamanho);
        Map<Long, String> nomes = nomesDosCursos(resultado.content());
        List<AvisoResponse> conteudo = resultado.content().stream()
                .map(a -> AvisoResponse.de(a, nomeDo(nomes, a)))
                .toList();
        return new PageResponse<>(conteudo, resultado.page(), resultado.size(), resultado.totalElements(),
                resultado.totalPages());
    }

    /** {@code Map.of().get(null)} lança NPE: o aviso GERAL não tem curso. */
    private static String nomeDo(Map<Long, String> nomes, Aviso aviso) {
        return aviso.cursoId == null ? null : nomes.get(aviso.cursoId);
    }

    /** Uma chamada só a {@code identidade} por resposta, para resolver o nome dos cursos dos escopos. */
    private Map<Long, String> nomesDosCursos(List<Aviso> avisos) {
        List<Long> ids = avisos.stream().map(a -> a.cursoId).filter(Objects::nonNull).distinct().toList();
        return ids.isEmpty() ? Map.of() : cursoConsulta.nomes(ids);
    }
}
