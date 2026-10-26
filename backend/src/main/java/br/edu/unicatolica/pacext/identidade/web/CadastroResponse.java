package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import java.time.Instant;

/** Resposta de {@code POST /auth/registro} — nunca inclui senha/hash nem token de confirmação. */
public record CadastroResponse(Long id, String nome, String email, String curso, boolean emailConfirmado,
        Instant criadoEm) {

    public static CadastroResponse de(Usuario usuario) {
        return new CadastroResponse(usuario.id, usuario.nome, usuario.email, usuario.cursoNome, usuario.emailConfirmado,
                usuario.criadoEm);
    }
}
