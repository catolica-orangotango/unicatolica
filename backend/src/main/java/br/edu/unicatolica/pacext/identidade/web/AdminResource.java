package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.identidade.aplicacao.AdminService;
import br.edu.unicatolica.pacext.identidade.aplicacao.UsuarioAdminService;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/** Área de administração; a autorização é decidida nos services ({@link AdminService}, {@link UsuarioAdminService}). */
@Path("/admin")
public class AdminResource {

    @Inject
    AdminService adminService;

    @Inject
    UsuarioAdminService usuarioAdminService;

    @GET
    @Path("/painel")
    @Produces(MediaType.APPLICATION_JSON)
    public Response painel() {
        return Response.ok(new PainelAdminResponse(adminService.painel())).build();
    }

    /** KAN-83 — usuários da plataforma, paginado, com busca por nome/e-mail e filtro por perfil. */
    @GET
    @Path("/usuarios")
    @Produces(MediaType.APPLICATION_JSON)
    public PageResponse<UsuarioAdminResponse> listarUsuarios(
            @QueryParam("busca") String busca,
            @QueryParam("perfil") String perfil,
            @QueryParam("pagina") @DefaultValue("0") int pagina,
            @QueryParam("tamanho") @DefaultValue("20") int tamanho) {
        PageResponse<Usuario> resultado = usuarioAdminService.listar(busca, perfil, pagina, tamanho);
        return new PageResponse<>(resultado.content().stream().map(UsuarioAdminResponse::de).toList(),
                resultado.page(), resultado.size(), resultado.totalElements(), resultado.totalPages());
    }

    @PUT
    @Path("/usuarios/{id}/perfil")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public UsuarioAdminResponse alterarPerfil(@PathParam("id") Long id,
            @NotNull @Valid AlterarPerfilRequest request) {
        return UsuarioAdminResponse.de(usuarioAdminService.alterarPerfil(id, request.perfil()));
    }

    @PUT
    @Path("/usuarios/{id}/ativo")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public UsuarioAdminResponse alterarSituacao(@PathParam("id") Long id,
            @NotNull @Valid AlterarSituacaoRequest request) {
        return UsuarioAdminResponse.de(usuarioAdminService.alterarSituacao(id, request.ativo()));
    }
}
