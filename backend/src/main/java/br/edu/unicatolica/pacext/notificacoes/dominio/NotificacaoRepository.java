package br.edu.unicatolica.pacext.notificacoes.dominio;

import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import io.quarkus.panache.common.Page;
import io.quarkus.panache.common.Sort;
import java.util.List;
import java.util.Optional;
import jakarta.enterprise.context.ApplicationScoped;

/** Repository do módulo Notificações — único ponto de acesso à tabela {@code notificacao} (AD-3). */
@ApplicationScoped
public class NotificacaoRepository implements PanacheRepository<Notificacao> {

    public List<Notificacao> listarPorUsuario(Long usuarioId, int pagina, int tamanho) {
        return find("usuarioId = ?1", Sort.by("criadoEm").descending(), usuarioId)
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
}
