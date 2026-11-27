package br.edu.unicatolica.pacext.notificacoes.dominio;

import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import jakarta.enterprise.context.ApplicationScoped;

/** Repository do módulo Notificações — único ponto de acesso à tabela {@code notificacao} (AD-3). */
@ApplicationScoped
public class NotificacaoRepository implements PanacheRepository<Notificacao> {

    /** Story 10.2 (RN02) — mais recente primeiro; {@code id} desempata notificações no mesmo instante. */
    private static final Sort MAIS_RECENTE_PRIMEIRO =
            Sort.by("criadoEm", Sort.Direction.Descending).and("id", Sort.Direction.Descending);

    public List<Notificacao> listarPorUsuario(Long usuarioId, int pagina, int tamanho) {
        return find("usuarioId = ?1", MAIS_RECENTE_PRIMEIRO, usuarioId)
                .page(Page.of(pagina, tamanho))
                .list();
    }

    public long contarPorUsuario(Long usuarioId) {
        return count("usuarioId = ?1", usuarioId);
    }

    public Optional<Notificacao> buscarPorIdEUsuario(Long id, Long usuarioId) {
        return find("id = ?1 and usuarioId = ?2", id, usuarioId).firstResultOptional();
    }

    public boolean existeNaoLidaDoTipo(Long usuarioId, TipoNotificacao tipo) {
        return count("usuarioId = ?1 and tipo = ?2 and lida = false", usuarioId, tipo) > 0;
    }

    /** @return quantas notificações foram marcadas — usado só para log/depuração. */
    public int marcarLidasPorTipo(Long usuarioId, TipoNotificacao tipo) {
        return update("lida = true where usuarioId = ?1 and tipo = ?2 and lida = false", usuarioId, tipo);
    }

    /** Story 10.2 (RN04) — total de não lidas, calculado no backend (nunca sobre uma página). */
    public long contarNaoLidas(Long usuarioId) {
        return count("usuarioId = ?1 and lida = false", usuarioId);
    }

    /** Story 10.2 (RF69.4) — id da notificação mais recente, ou vazio sem nenhuma. */
    public Optional<Long> buscarIdMaisRecente(Long usuarioId) {
        return find("usuarioId = ?1", MAIS_RECENTE_PRIMEIRO, usuarioId).firstResultOptional().map(n -> n.id);
    }

    /** Story 10.2 (RF68.2, RN07) — marca as não lidas criadas até {@code ate}; @return quantas. */
    public int marcarTodasComoLidas(Long usuarioId, Instant ate) {
        return update("lida = true where usuarioId = ?1 and lida = false and criadoEm <= ?2", usuarioId, ate);
    }
}
