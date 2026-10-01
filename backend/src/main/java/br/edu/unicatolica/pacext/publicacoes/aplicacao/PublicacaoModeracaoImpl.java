package br.edu.unicatolica.pacext.publicacoes.aplicacao;

import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeracao;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeravel;
import br.edu.unicatolica.pacext.publicacoes.dominio.Publicacao;
import br.edu.unicatolica.pacext.publicacoes.dominio.PublicacaoRepository;
import br.edu.unicatolica.pacext.publicacoes.dominio.SituacaoPublicacao;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Implementação package-private — só é alcançável via {@link PublicacaoModeracao} (AD-3). */
@ApplicationScoped
class PublicacaoModeracaoImpl implements PublicacaoModeracao {

    @Inject
    PublicacaoRepository publicacaoRepository;

    @Override
    public Optional<PublicacaoModeravel> buscar(Long publicacaoId) {
        return publicacaoRepository.findByIdOptional(publicacaoId).map(PublicacaoModeracaoImpl::moderavel);
    }

    @Override
    public Map<Long, PublicacaoModeravel> buscar(Collection<Long> publicacaoIds) {
        if (publicacaoIds.isEmpty()) {
            return Map.of();
        }
        return publicacaoRepository.buscarPorIds(publicacaoIds).stream()
                .map(PublicacaoModeracaoImpl::moderavel)
                .collect(Collectors.toMap(PublicacaoModeravel::id, Function.identity()));
    }

    @Override
    @Transactional
    public void ocultar(Long publicacaoId) {
        mudarSituacao(publicacaoId, SituacaoPublicacao.OCULTA);
    }

    @Override
    @Transactional
    public void restaurar(Long publicacaoId) {
        mudarSituacao(publicacaoId, SituacaoPublicacao.VISIVEL);
    }

    private void mudarSituacao(Long publicacaoId, SituacaoPublicacao situacao) {
        publicacaoRepository.findByIdOptional(publicacaoId).ifPresent(p -> p.situacao = situacao);
    }

    private static PublicacaoModeravel moderavel(Publicacao p) {
        return new PublicacaoModeravel(p.id, p.comunidadeId, p.autorUsuarioId, p.conteudo, p.criadoEm,
                p.situacao == SituacaoPublicacao.OCULTA);
    }
}
