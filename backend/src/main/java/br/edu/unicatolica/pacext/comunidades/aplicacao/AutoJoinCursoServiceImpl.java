package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService;
import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembroRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.PapelMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.TipoComunidade;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import org.jboss.logging.Logger;

/**
 * Implementação do auto-join de curso (RF24.1, Story 2.3). Classe intencionalmente
 * package-private — só é alcançável via {@link AutoJoinCursoService} (AD-3), nunca por
 * referência direta de outro módulo.
 */
@ApplicationScoped
class AutoJoinCursoServiceImpl implements AutoJoinCursoService {

    private static final Logger LOG = Logger.getLogger(AutoJoinCursoServiceImpl.class);

    @Inject
    ComunidadeRepository comunidadeRepository;

    @Inject
    ComunidadeMembroRepository comunidadeMembroRepository;

    @Override
    @Transactional
    public void sincronizarCursoDoAluno(Long usuarioId, String cursoAnterior, String cursoNovo) {
        Objects.requireNonNull(usuarioId, "usuarioId é obrigatório.");

        if (cursoAnterior != null && cursoAnterior.equalsIgnoreCase(cursoNovo)) {
            return; // nada mudou — idempotente, não repete trabalho (RF24.1).
        }

        if (cursoAnterior != null) {
            removerDaComunidadeDoCurso(usuarioId, cursoAnterior);
        }
        if (cursoNovo != null) {
            associarAComunidadeDoCurso(usuarioId, cursoNovo);
        }
    }

    private void removerDaComunidadeDoCurso(Long usuarioId, String curso) {
        comunidadeRepository.buscarPorTipoENome(TipoComunidade.CURSO, curso)
                .ifPresent(comunidade -> comunidadeMembroRepository.removerAssociacao(comunidade, usuarioId));
    }

    private void associarAComunidadeDoCurso(Long usuarioId, String curso) {
        Optional<Comunidade> comunidadeDoCurso = comunidadeRepository.buscarPorTipoENome(TipoComunidade.CURSO, curso);
        if (comunidadeDoCurso.isEmpty()) {
            // Story 2.1 (pré-criação de comunidade de curso pelo administrador) está fora desta
            // implementação — se o curso ainda não foi cadastrado como comunidade, o auto-join
            // não bloqueia o cadastro do aluno, só não tem o que associar ainda.
            LOG.warnf("Auto-join: nenhuma comunidade de curso encontrada para '%s' (usuarioId=%d).", curso,
                    usuarioId);
            return;
        }

        Comunidade comunidade = comunidadeDoCurso.get();
        if (comunidadeMembroRepository.existeAssociacao(comunidade, usuarioId)) {
            return; // idempotente — já é membro, não duplica (não passa pela validação de RF25).
        }

        ComunidadeMembro membro = new ComunidadeMembro();
        membro.comunidade = comunidade;
        membro.usuarioId = usuarioId;
        membro.papelNaComunidade = PapelMembro.MEMBRO;
        membro.entrouEm = Instant.now();
        comunidadeMembroRepository.persist(membro);
    }
}
