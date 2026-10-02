package br.edu.unicatolica.pacext.notificacoes.web;

import br.edu.unicatolica.pacext.notificacoes.dominio.Notificacao;
import java.time.Instant;

public record NotificacaoResponse(Long id, String tipo, String texto, String link, boolean lida, Instant criadoEm) {

    public static NotificacaoResponse de(Notificacao notificacao) {
        return new NotificacaoResponse(notificacao.id, notificacao.tipo.name(), notificacao.texto,
                notificacao.link, notificacao.lida, notificacao.criadoEm);
    }
}
