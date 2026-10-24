package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.dominio.Usuario;

/** DTO de resposta para {@code /usuarios/me} e {@code /usuarios/{id}} (RF12/RF13). */
public record UsuarioResponse(Long id, String nome, String email, String perfil, String curso) {

    public static UsuarioResponse de(Usuario usuario) {
        return new UsuarioResponse(usuario.id, usuario.nome, usuario.email, usuario.perfil, usuario.cursoNome);
    }
}
