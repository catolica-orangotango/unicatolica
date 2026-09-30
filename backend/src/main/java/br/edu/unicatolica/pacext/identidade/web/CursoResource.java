package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.aplicacao.CursoService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

/**
 * {@code GET /cursos} — lista do select do cadastro e do perfil. Rota pública só para
 * leitura (allowlist do {@code JwtSecurityFilter}, AD-2): a tela de cadastro precisa dela
 * antes do login.
 */
@Path("/cursos")
public class CursoResource {

    @Inject
    CursoService cursoService;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<CursoResponse> listar() {
        return cursoService.listarAtivos().stream().map(CursoResponse::de).toList();
    }
}
