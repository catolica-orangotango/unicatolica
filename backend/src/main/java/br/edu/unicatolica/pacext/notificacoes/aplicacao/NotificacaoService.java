package br.edu.unicatolica.pacext.notificacoes.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.notificacoes.NotificacaoEmissor;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import br.edu.unicatolica.pacext.notificacoes.dominio.Notificacao;
import br.edu.unicatolica.pacext.notificacoes.dominio.NotificacaoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;

/**
 * Implementa {@link NotificacaoEmissor} (API pública, usada por outro módulo) e os casos de
 * uso do próprio módulo (lista/marca como lida) usados por {@code web.NotificacaoResource}.
 */
@ApplicationScoped
public class NotificacaoService implements NotificacaoEmissor {

    @Inject
    NotificacaoRepository notificacaoRepository;

    @Override
    @Transactional
    public void notificar(Long usuarioId, TipoNotificacao tipo, String texto, String link) {
        Notificacao notificacao = new Notificacao();
        notificacao.usuarioId = usuarioId;
        notificacao.tipo = tipo;
        notificacao.texto = texto;
        notificacao.link = link;
        notificacao.lida = false;
        notificacao.criadoEm = Instant.now();
        notificacaoRepository.persist(notificacao);
    }

    @Override
    public boolean possuiNaoLidaDoTipo(Long usuarioId, TipoNotificacao tipo) {
        return notificacaoRepository.existeNaoLidaDoTipo(usuarioId, tipo);
    }

    @Override
    @Transactional
    public void marcarComoLidaPorTipo(Long usuarioId, TipoNotificacao tipo) {
        notificacaoRepository.marcarLidasPorTipo(usuarioId, tipo);
    }

    public PageResponse<Notificacao> listar(Long usuarioId, int pagina, int tamanho) {
        var conteudo = notificacaoRepository.listarPorUsuario(usuarioId, pagina, tamanho);
        long total = notificacaoRepository.contarPorUsuario(usuarioId);
        return PageResponse.de(conteudo, pagina, tamanho, total);
    }

    @Transactional
    public void marcarComoLida(Long usuarioId, Long notificacaoId) {
        Notificacao notificacao = notificacaoRepository.buscarPorIdEUsuario(notificacaoId, usuarioId)
                .orElseThrow(() -> ApiException.naoEncontrado("NOTIFICACAO_NAO_ENCONTRADA",
                        "Notificação não encontrada.", null));
        notificacao.lida = true;
    }
}
