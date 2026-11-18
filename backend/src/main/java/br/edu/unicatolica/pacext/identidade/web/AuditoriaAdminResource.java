package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.identidade.aplicacao.AuditoriaAdminService;
import br.edu.unicatolica.pacext.identidade.aplicacao.AuditoriaAdminService.RegistroComAutor;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.LocalDate;

/** Consulta de logs de auditoria pelo administrador (KAN-90); a autorização é decidida no service. */
@Path("/admin/auditoria")
public class AuditoriaAdminResource {

    @Inject
    AuditoriaAdminService auditoriaAdminService;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<LogAuditoriaResponse> listar(
            @QueryParam("modulo") String modulo,
            @QueryParam("acao") String acao,
            @QueryParam("entidadeAfetada") String entidadeAfetada,
            @QueryParam("detalhes") String detalhes,
            @QueryParam("de") LocalDate de,
            @QueryParam("ate") LocalDate ate,
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        PageResponse<RegistroComAutor> resultado = auditoriaAdminService.listar(modulo, acao, entidadeAfetada,
                detalhes, de, ate, pagina, tamanho);
        return new PageResponse<>(resultado.content().stream().map(LogAuditoriaResponse::de).toList(),
                resultado.page(), resultado.size(), resultado.totalElements(), resultado.totalPages());
    }

    @GET
    @Path("/filtros")
    @Produces(MediaType.APPLICATION_JSON)
    public FiltrosAuditoriaResponse filtros() {
        return FiltrosAuditoriaResponse.de(auditoriaAdminService.filtros());
    }
}
