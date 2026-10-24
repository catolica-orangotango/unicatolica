package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.dominio.Usuario;

/** Item da lista e resultado das alterações em {@code /admin/usuarios} (KAN-83). */
public record UsuarioAdminResponse(Long id, String nomeCompleto, String email, String curso, String perfil,
        boolean ativo) {

    public static UsuarioAdminResponse de(Usuario usuario) {
        return new UsuarioAdminResponse(usuario.id, usuario.nome, usuario.email, usuario.cursoNome, usuario.perfil,
                usuario.ativo);
    }
}
