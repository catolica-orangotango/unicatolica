package br.edu.unicatolica.pacext.identidade.web;

/** Corpo de {@code PUT /admin/usuarios/{id}/perfil}; perfil ausente ou desconhecido vira 422 no service. */
public record AlterarPerfilRequest(String perfil) {
}
