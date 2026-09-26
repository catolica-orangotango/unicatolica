package br.edu.unicatolica.pacext.comunidades.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

/** Repository do módulo Comunidades — único ponto de acesso à tabela {@code comunidade_membro} (AD-3). */
@ApplicationScoped
public class ComunidadeMembroRepository implements PanacheRepository<ComunidadeMembro> {

    public boolean existeAssociacao(Comunidade comunidade, Long usuarioId) {
        return count("comunidade = ?1 and usuarioId = ?2", comunidade, usuarioId) > 0;
    }

    /** Home (RF27.1-ish) — "Suas comunidades" na barra lateral, mais recente primeiro. */
    public List<ComunidadeMembro> listarPorUsuario(Long usuarioId) {
        return list("usuarioId = ?1 order by entrouEm desc", usuarioId);
    }

    public long removerAssociacao(Comunidade comunidade, Long usuarioId) {
        return delete("comunidade = ?1 and usuarioId = ?2", comunidade, usuarioId);
    }

    /** Story 2.5 (RF27.1) — o frontend usa isso pra decidir se mostra a caixa de postar/comentar/votar. */
    public long contarMembros(Comunidade comunidade) {
        return count("comunidade = ?1", comunidade);
    }
}
