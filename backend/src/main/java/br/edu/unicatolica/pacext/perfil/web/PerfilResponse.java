package br.edu.unicatolica.pacext.perfil.web;

import br.edu.unicatolica.pacext.perfil.aplicacao.PerfilCompleto;
import java.util.List;

/** Resposta de {@code GET /perfil/me}, {@code PUT /perfil/me} e {@code GET /perfil/{usuarioId}}. */
public record PerfilResponse(Long usuarioId, String nome, String curso, Integer periodo, List<String> interesses) {

    public static PerfilResponse de(PerfilCompleto perfil) {
        return new PerfilResponse(perfil.usuarioId(), perfil.nome(), perfil.curso(), perfil.periodo(),
                perfil.interesses());
    }
}
