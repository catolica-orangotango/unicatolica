package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.dominio.Curso;

/** Schema {@code Curso} do contrato. */
public record CursoResponse(Long id, String nome) {

    static CursoResponse de(Curso curso) {
        return new CursoResponse(curso.id, curso.nome);
    }
}
