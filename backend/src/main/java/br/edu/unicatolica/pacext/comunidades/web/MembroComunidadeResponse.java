package br.edu.unicatolica.pacext.comunidades.web;

import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembro;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import java.time.Instant;

/** Schema {@code MembroComunidadeResponse} — nome e curso vêm de {@code identidade.UsuarioConsulta} (AD-3). */
public record MembroComunidadeResponse(Long usuarioId, String nome, String curso, String papel, Instant membroDesde) {

    static final String NOME_USUARIO_AUSENTE = "Usuário removido";

    static MembroComunidadeResponse de(ComunidadeMembro membro, UsuarioResumo usuario) {
        String nome = usuario == null ? NOME_USUARIO_AUSENTE : usuario.nome();
        String curso = usuario == null ? null : usuario.curso();
        return new MembroComunidadeResponse(membro.usuarioId, nome, curso, membro.papelNaComunidade.name(),
                membro.entrouEm);
    }
}
