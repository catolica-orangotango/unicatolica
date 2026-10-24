package br.edu.unicatolica.pacext.identidade.web;

import br.edu.unicatolica.pacext.identidade.dominio.Curso;

/** Schema {@code CursoAdmin} do contrato: o curso com a situação, só para o administrador. */
public record CursoAdminResponse(Long id, String nome, boolean ativo) {

    static CursoAdminResponse de(Curso curso) {
        return new CursoAdminResponse(curso.id, curso.nome, curso.ativo);
    }
}
