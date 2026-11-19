package br.edu.unicatolica.pacext.enquetes.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.enquetes.aplicacao.EnqueteService;
import br.edu.unicatolica.pacext.enquetes.dominio.Enquete;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

/** Story 8.1 — as enquetes ativas do usuário autenticado, em todas as comunidades (RF53.3). */
@Path("/enquetes/minhas")
public class MinhasEnquetesResource {

    @Inject
    EnqueteService enqueteService;

    @Inject
    UsuarioConsulta usuarioConsulta;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<EnqueteResponse> listar(
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        Long usuarioId = usuarioAutenticado.id();
        PageResponse<Enquete> resultado = enqueteService.listarAtivasDoUsuario(usuarioId, pagina, tamanho);
        return EnqueteResponse.pagina(resultado, usuarioConsulta, enqueteService.enquetesVotadas(usuarioId, resultado.content()));
    }
}
