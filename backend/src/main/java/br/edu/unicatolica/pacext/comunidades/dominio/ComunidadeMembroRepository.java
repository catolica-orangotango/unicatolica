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

    /**
     * Mesma checagem só pelo id — para {@code ComunidadeConsulta}, sem carregar a comunidade.
     * Comunidade excluída (Story 2.6, RF31) não tem mais membros para fins de interação.
     */
    public boolean existeAssociacao(Long comunidadeId, Long usuarioId) {
        return count("comunidade.id = ?1 and comunidade.ativa = true and usuarioId = ?2", comunidadeId, usuarioId) > 0;
    }

    /** Story 2.6 (RF29/RF30/RF31) — administrador da comunidade, não da plataforma. */
    public boolean ehAdministrador(Comunidade comunidade, Long usuarioId) {
        return count("comunidade = ?1 and usuarioId = ?2 and papelNaComunidade = ?3", comunidade, usuarioId,
                PapelMembro.ADMINISTRADOR) > 0;
    }

    /** Home (RF27.1-ish) — "Suas comunidades" na barra lateral, mais recente primeiro; sem as excluídas (RF31). */
    public List<ComunidadeMembro> listarPorUsuario(Long usuarioId) {
        return list("usuarioId = ?1 and comunidade.ativa = true order by entrouEm desc", usuarioId);
    }

    public long removerAssociacao(Comunidade comunidade, Long usuarioId) {
        return delete("comunidade = ?1 and usuarioId = ?2", comunidade, usuarioId);
    }

    /** Story 2.5 (RF27.1) — o frontend usa isso pra decidir se mostra a caixa de postar/comentar/votar. */
    public long contarMembros(Comunidade comunidade) {
        return count("comunidade = ?1", comunidade);
    }
}
