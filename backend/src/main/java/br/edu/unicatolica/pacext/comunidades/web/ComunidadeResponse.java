package br.edu.unicatolica.pacext.comunidades.web;

import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import java.time.Instant;

/**
 * Resposta com dados de uma comunidade. {@code souMembro} (RF27.1) orienta o frontend a
 * mostrar a caixa de postar/comentar/votar ou o aviso de não-membro — {@code null} nas
 * listagens (2.5 lista), preenchido só na consulta de uma comunidade específica.
 */
public record ComunidadeResponse(Long id, String nome, String descricao, String tipo, Boolean souMembro,
        Instant criadoEm) {

    public static ComunidadeResponse de(Comunidade comunidade) {
        return de(comunidade, null);
    }

    public static ComunidadeResponse de(Comunidade comunidade, Boolean souMembro) {
        return new ComunidadeResponse(comunidade.id, comunidade.nome, comunidade.descricao,
                comunidade.tipo.name(), souMembro, comunidade.criadoEm);
    }
}
