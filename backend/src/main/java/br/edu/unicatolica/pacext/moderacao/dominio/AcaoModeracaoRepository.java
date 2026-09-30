package br.edu.unicatolica.pacext.moderacao.dominio;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;

/** Repository do módulo Moderação — único ponto de acesso à tabela {@code acao_moderacao} (AD-3). */
@ApplicationScoped
public class AcaoModeracaoRepository implements PanacheRepository<AcaoModeracao> {

    /** Histórico da denúncia, na ordem em que as decisões aconteceram. */
    public List<AcaoModeracao> listarPorDenuncia(Denuncia denuncia) {
        return list("denuncia = ?1 order by criadoEm, id", denuncia);
    }
}
