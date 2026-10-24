package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService;
import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembroRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.PapelMembro;
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
    public void sincronizarCursoDoAluno(Long usuarioId, Long cursoAnteriorId, Long cursoNovoId) {
        Objects.requireNonNull(usuarioId, "usuarioId é obrigatório.");

        if (cursoNaoMudou(cursoAnteriorId, cursoNovoId)) {
            return;
        }
        sairDaComunidadeDoCurso(usuarioId, cursoAnteriorId);
        entrarNaComunidadeDoCurso(usuarioId, cursoNovoId);
    }

    /** Idempotente: se o curso é o mesmo, não repete trabalho (RF24.1). */
    private static boolean cursoNaoMudou(Long cursoAnteriorId, Long cursoNovoId) {
        return cursoAnteriorId != null && cursoAnteriorId.equals(cursoNovoId);
    }

    /** Sem curso anterior (primeira definição, como no cadastro) não há de onde sair. */
    private void sairDaComunidadeDoCurso(Long usuarioId, Long cursoAnteriorId) {
        if (cursoAnteriorId == null) {
            return;
        }
        comunidadeRepository.buscarAtivaPorCursoId(cursoAnteriorId)
                .ifPresent(comunidade -> comunidadeMembroRepository.removerAssociacao(comunidade, usuarioId));
    }

    private void entrarNaComunidadeDoCurso(Long usuarioId, Long cursoNovoId) {
        if (cursoNovoId == null) {
            return;
        }
        buscarComunidadeAtiva(cursoNovoId, usuarioId)
                .ifPresent(comunidade -> adicionarSeAindaNaoEMembro(comunidade, usuarioId));
    }

    /**
     * A comunidade de curso nasce com o cadastro do curso (Story 2.1). Se não achar (curso
     * criado antes do vínculo por id, ou comunidade excluída), o auto-join não bloqueia o
     * cadastro do aluno: só avisa no log, já que não há o que associar.
     */
    private Optional<Comunidade> buscarComunidadeAtiva(Long cursoId, Long usuarioId) {
        Optional<Comunidade> comunidade = comunidadeRepository.buscarAtivaPorCursoId(cursoId);
        if (comunidade.isEmpty()) {
            LOG.warnf("Auto-join: nenhuma comunidade de curso ativa para o cursoId=%d (usuarioId=%d).", cursoId,
                    usuarioId);
        }
        return comunidade;
    }

    /** Idempotente: quem já é membro não é duplicado (e não passa pela validação de RF25). */
    private void adicionarSeAindaNaoEMembro(Comunidade comunidade, Long usuarioId) {
        if (comunidadeMembroRepository.existeAssociacao(comunidade, usuarioId)) {
            return;
        }
        comunidadeMembroRepository.persist(novoMembro(comunidade, usuarioId));
    }

    private static ComunidadeMembro novoMembro(Comunidade comunidade, Long usuarioId) {
        ComunidadeMembro membro = new ComunidadeMembro();
        membro.comunidade = comunidade;
        membro.usuarioId = usuarioId;
        membro.papelNaComunidade = PapelMembro.MEMBRO;
        membro.entrouEm = Instant.now();
        return membro;
    }
}
