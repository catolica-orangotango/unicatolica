package br.edu.unicatolica.pacext.publicacoes.web;

import br.edu.unicatolica.pacext.identidade.UsuarioResumo;

/** Schema {@code AutorResumo} do contrato — nome e curso vêm de {@code identidade.UsuarioConsulta} (AD-3). */
public record AutorResumo(Long id, String nome, String curso) {

    /** Autor que não existe mais em Identidade — o feed continua mostrando a postagem. */
    static final String NOME_AUTOR_AUSENTE = "Usuário removido";

    static AutorResumo de(Long autorId, UsuarioResumo usuario) {
        if (usuario == null) {
            return new AutorResumo(autorId, NOME_AUTOR_AUSENTE, null);
        }
        return new AutorResumo(usuario.id(), usuario.nome(), usuario.curso());
    }
}
