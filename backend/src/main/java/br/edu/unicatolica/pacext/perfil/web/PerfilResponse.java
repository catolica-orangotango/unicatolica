package br.edu.unicatolica.pacext.perfil.web;

import br.edu.unicatolica.pacext.perfil.aplicacao.PerfilCompleto;
import java.util.List;

/**
 * Schema {@code Perfil} do contrato — o mesmo para o próprio perfil e o de outro usuário
 * (RF20.2): sem e-mail nem outro dado sensível.
 */
public record PerfilResponse(Long usuarioId, String nome, CursoResumo curso, Short periodo, List<String> interesses) {

    static PerfilResponse de(PerfilCompleto perfil) {
        CursoResumo curso = perfil.cursoId() == null ? null : new CursoResumo(perfil.cursoId(), perfil.cursoNome());
        return new PerfilResponse(perfil.usuarioId(), perfil.nome(), curso, perfil.periodo(), perfil.interesses());
    }
}
