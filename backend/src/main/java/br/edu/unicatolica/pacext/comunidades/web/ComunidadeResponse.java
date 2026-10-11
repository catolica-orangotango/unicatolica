package br.edu.unicatolica.pacext.comunidades.web;

import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import java.time.Instant;

/**
 * Resposta com dados de uma comunidade. {@code souMembro} (RF27.1) orienta o frontend a
 * mostrar a caixa de postar/comentar/votar ou o aviso de não-membro, e {@code souAdministrador}
 * (Story 2.6) as ações de administração — os dois {@code null} nas listagens (2.5 lista),
 * preenchidos só quando a resposta é sobre o usuário autenticado.
 */
public record ComunidadeResponse(Long id, String nome, String descricao, String tipo, Boolean souMembro,
        Boolean souAdministrador, Instant criadoEm) {

    public static ComunidadeResponse de(Comunidade comunidade) {
        return de(comunidade, null, null);
    }

    public static ComunidadeResponse de(Comunidade comunidade, Boolean souMembro, Boolean souAdministrador) {
        return new ComunidadeResponse(comunidade.id, comunidade.nome, comunidade.descricao,
                comunidade.tipo.name(), souMembro, souAdministrador, comunidade.criadoEm);
    }
}
