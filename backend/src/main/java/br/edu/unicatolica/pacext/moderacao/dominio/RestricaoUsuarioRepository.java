package br.edu.unicatolica.pacext.moderacao.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Instant;

/** Repository do módulo Moderação — único ponto de acesso à tabela {@code restricao_usuario} (AD-3). */
@ApplicationScoped
public class RestricaoUsuarioRepository implements PanacheRepository<RestricaoUsuario> {

    /** RF80 — base da checagem que os outros módulos vão consultar antes de aceitar postagem/comentário. */
    public boolean existeRestricaoAtiva(Long usuarioId, Instant agora) {
        return count("usuarioId = ?1 and inicioEm <= ?2 and revogadaEm is null and (fimEm is null or fimEm > ?2)",
                usuarioId, agora) > 0;
    }
}
