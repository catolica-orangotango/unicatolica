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

    /** Story 10.2 (RN03) — {@code tamanho} fora de 1-20 é ajustado antes de consultar o repository. */
    public PageResponse<Notificacao> listar(Long usuarioId, int pagina, int tamanho) {
        int tamanhoAjustado = Math.max(1, Math.min(20, tamanho));
        var conteudo = notificacaoRepository.listarPorUsuario(usuarioId, pagina, tamanhoAjustado);
        long total = notificacaoRepository.contarPorUsuario(usuarioId);
        return PageResponse.de(conteudo, pagina, tamanhoAjustado, total);
    }

    /** Story 10.2 (RN04) — total de não lidas calculado pelo backend, nunca sobre uma página. */
    public long contarNaoLidas(Long usuarioId) {
        return notificacaoRepository.contarNaoLidas(usuarioId);
    }

    /** Story 10.2 (RF69.4) — para a consulta periódica de 10 s da shell (RN19). */
    public ResumoNotificacoes resumo(Long usuarioId) {
        long totalNaoLidas = notificacaoRepository.contarNaoLidas(usuarioId);
        Long ultimaNotificacaoId = notificacaoRepository.buscarIdMaisRecente(usuarioId).orElse(null);
        return new ResumoNotificacoes(totalNaoLidas, ultimaNotificacaoId);
    }

    @Transactional
    public void marcarComoLida(Long usuarioId, Long notificacaoId) {
        Notificacao notificacao = notificacaoRepository.buscarPorIdEUsuario(notificacaoId, usuarioId)
                .orElseThrow(() -> ApiException.naoEncontrado("NOTIFICACAO_NAO_ENCONTRADA",
                        "Notificação não encontrada.", null));
        notificacao.lida = true;
    }

    /** Story 10.2 (RF68.2, RN07) — marca as não lidas criadas até o momento da chamada. */
    @Transactional
    public void marcarTodasComoLidas(Long usuarioId) {
        notificacaoRepository.marcarTodasComoLidas(usuarioId, Instant.now());
    }

    /** Story 10.2 (RF84, RN08) — exclusão física, sem confirmação, não pode ser desfeita. */
    @Transactional
    public void excluir(Long usuarioId, Long notificacaoId) {
        Notificacao notificacao = notificacaoRepository.buscarPorIdEUsuario(notificacaoId, usuarioId)
                .orElseThrow(() -> ApiException.naoEncontrado("NOTIFICACAO_NAO_ENCONTRADA",
                        "Notificação não encontrada.", null));
        notificacaoRepository.delete(notificacao);
    }
}
