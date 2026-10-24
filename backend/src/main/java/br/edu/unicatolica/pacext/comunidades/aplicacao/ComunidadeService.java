package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.dominio.Comunidade;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembroRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.PapelMembro;
import br.edu.unicatolica.pacext.comunidades.dominio.TipoComunidade;
import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Regras de negócio das Stories 2.2 (criar comunidade aberta), 2.4 (entrar/sair), 2.5
 * (listar/filtrar/visualizar) e 2.6 (administrar: remover membro, editar, excluir) do Epic 2.
 * Entrada rápida (protótipo desta fatia, ver docs/decisoes/2026-08-modelo-epico-2-comunidades.md) —
 * Story 2.1 (endpoint de admin criar comunidade de curso) fica de fora por falta do endpoint
 * (o papel ADMINISTRADOR de plataforma já existe em Identidade). Na 2.6 o administrador é o
 * papel {@code ADMINISTRADOR} <em>dentro da comunidade</em>, não o da plataforma.
 */
@ApplicationScoped
public class ComunidadeService {

    static final int TAMANHO_MAXIMO_PAGINA = 100;

    @Inject
    ComunidadeRepository comunidadeRepository;

    @Inject
    ComunidadeMembroRepository comunidadeMembroRepository;

    @Inject
    AuditoriaService auditoriaService;

    /**
     * Story 2.1 (RF21.2) — comunidade do curso recém-cadastrado, sem membros: os alunos entram
     * pelo auto-join. Chamada pelo observer de {@code CursoCadastrado}, na transação do
     * cadastro do curso; nome já usado por outra comunidade devolve 409 e desfaz o cadastro.
     * Idempotente: se já existe comunidade para o curso, não cria outra.
     */
    @Transactional
    public void criarComunidadeDeCurso(Long cursoId, String nome, Long criadoPorUsuarioId) {
        if (comunidadeRepository.existePorCursoId(cursoId)) {
            return;
        }
        if (comunidadeRepository.existePorNome(nome)) {
            throw nomeDeComunidadeEmUso();
        }

        Comunidade comunidade = novaComunidadeDeCurso(cursoId, nome, criadoPorUsuarioId);
        comunidadeRepository.persist(comunidade);

        auditoriaService.registrar(criadoPorUsuarioId, "comunidades", "COMUNIDADE_CURSO_CRIADA", "Comunidade",
                comunidade.id, "cursoId=" + cursoId);
    }

    private static Comunidade novaComunidadeDeCurso(Long cursoId, String nome, Long criadoPorUsuarioId) {
        Comunidade comunidade = new Comunidade();
        comunidade.nome = nome.trim();
        comunidade.tipo = TipoComunidade.CURSO;
        comunidade.cursoId = cursoId;
        comunidade.criadoPorUsuarioId = criadoPorUsuarioId;
        comunidade.criadoEm = Instant.now();
        return comunidade;
    }

    /**
     * Story 2.1 / KAN-44 — o curso foi renomeado, a comunidade dele acompanha. Sem comunidade
     * ligada ao curso, não há o que renomear. Nome já usado por outra comunidade devolve 409
     * e desfaz a renomeação do curso.
     */
    @Transactional
    public void renomearComunidadeDeCurso(Long cursoId, String nome) {
        Optional<Comunidade> encontrada = comunidadeRepository.buscarAtivaPorCursoId(cursoId);
        if (encontrada.isEmpty()) {
            return;
        }

        Comunidade comunidade = encontrada.get();
        String nomeLimpo = nome.trim();
        if (comunidade.nome.equals(nomeLimpo)) {
            return;
        }
        if (comunidadeRepository.existePorNomeEDiferente(nomeLimpo, comunidade.id)) {
            throw nomeDeComunidadeEmUso();
        }

        comunidade.nome = nomeLimpo;
        comunidade.atualizadoEm = Instant.now();
        auditoriaService.registrar(null, "comunidades", "COMUNIDADE_CURSO_RENOMEADA", "Comunidade", comunidade.id,
                "cursoId=" + cursoId);
    }

    private static ApiException nomeDeComunidadeEmUso() {
        return ApiException.conflito("COMUNIDADE_NOME_EM_USO", "Já existe uma comunidade com esse nome.", null);
    }

    /**
     * Story 2.2 (RF21, RF22, RF23). Toda comunidade criada por aqui é {@code ABERTA} — a
     * comunidade de curso nasce com o cadastro do curso ({@link #criarComunidadeDeCurso});
     * o endpoint não aceita tipo no corpo de propósito, para não abrir brecha da RF21.2
     * (aluno não pode criar comunidade de curso).
     */
    @Transactional
    public Comunidade criarComunidadeAberta(Long usuarioId, String nome, String descricao) {
        validarNomeObrigatorio(nome);
        if (comunidadeRepository.existePorNome(nome)) {
            throw ApiException.conflito("COMUNIDADE_NOME_EM_USO", "Já existe uma comunidade com esse nome.", null);
        }

        Comunidade comunidade = new Comunidade();
        comunidade.nome = nome.trim();
        comunidade.descricao = descricao;
        comunidade.tipo = TipoComunidade.ABERTA;
        comunidade.criadoPorUsuarioId = usuarioId;
        comunidade.criadoEm = Instant.now();
        comunidadeRepository.persist(comunidade);

        ComunidadeMembro membro = new ComunidadeMembro();
        membro.comunidade = comunidade;
        membro.usuarioId = usuarioId;
        membro.papelNaComunidade = PapelMembro.ADMINISTRADOR;
        membro.entrouEm = Instant.now();
        comunidadeMembroRepository.persist(membro);

        auditoriaService.registrar(usuarioId, "comunidades", "COMUNIDADE_CRIADA", "Comunidade", comunidade.id, null);
        return comunidade;
    }

    /** Story 2.4 (RF24, RF25) — só comunidades abertas; impede ingresso duplicado. */
    @Transactional
    public void ingressar(Long usuarioId, Long comunidadeId) {
        Comunidade comunidade = buscarAbertaOuFalhar(comunidadeId);
        if (comunidadeMembroRepository.existeAssociacao(comunidade, usuarioId)) {
            throw ApiException.conflito("JA_E_MEMBRO", "Você já é membro dessa comunidade.", null);
        }

        ComunidadeMembro membro = new ComunidadeMembro();
        membro.comunidade = comunidade;
        membro.usuarioId = usuarioId;
        membro.papelNaComunidade = PapelMembro.MEMBRO;
        membro.entrouEm = Instant.now();
        comunidadeMembroRepository.persist(membro);
    }

    /** Story 2.4 (RF26). O único administrador não sai (Story 2.6): a comunidade ficaria sem administrador. */
    @Transactional
    public void sair(Long usuarioId, Long comunidadeId) {
        Comunidade comunidade = buscarOuFalhar(comunidadeId);
        if (comunidadeMembroRepository.ehAdministrador(comunidade, usuarioId)
                && comunidadeMembroRepository.contarAdministradores(comunidade) == 1) {
            throw ApiException.validacao("ULTIMO_ADMINISTRADOR",
                    "Você é o único administrador. Exclua a comunidade em vez de sair.", null);
        }
        comunidadeMembroRepository.removerAssociacao(comunidade, usuarioId);
    }

    /**
     * Story 2.6 (RF29) — só administrador da comunidade remove um membro, e nunca outro
     * administrador (nem a si mesmo): evita comunidade sem administrador. Para encerrar a
     * comunidade, o administrador a exclui.
     */
    @Transactional
    public void removerMembro(Long solicitanteId, Long comunidadeId, Long usuarioIdAlvo) {
        Comunidade comunidade = buscarOuFalhar(comunidadeId);
        validarAdministrador(comunidade, solicitanteId);
        if (!comunidadeMembroRepository.existeAssociacao(comunidade, usuarioIdAlvo)) {
            throw ApiException.naoEncontrado("MEMBRO_NAO_ENCONTRADO", "Esse usuário não é membro da comunidade.", null);
        }
        if (comunidadeMembroRepository.ehAdministrador(comunidade, usuarioIdAlvo)) {
            throw ApiException.validacao("ADMIN_NAO_PODE_SER_REMOVIDO",
                    "Um administrador não pode ser removido da comunidade.", "usuarioId");
        }
        comunidadeMembroRepository.removerAssociacao(comunidade, usuarioIdAlvo);
        auditoriaService.registrar(solicitanteId, "comunidades", "MEMBRO_REMOVIDO", "Comunidade", comunidade.id,
                "usuarioId=" + usuarioIdAlvo);
    }

    /**
     * Story 2.6 (RF30) — edição parcial: {@code null} mantém o campo; descrição em branco apaga.
     * O tipo nunca é alterado (imutável desde a criação).
     */
    @Transactional
    public Comunidade editar(Long solicitanteId, Long comunidadeId, String nome, String descricao) {
        Comunidade comunidade = buscarOuFalhar(comunidadeId);
        validarAdministrador(comunidade, solicitanteId);
        if (nome != null) {
            validarNomeObrigatorio(nome);
            if (comunidadeRepository.existePorNomeEDiferente(nome, comunidade.id)) {
                throw ApiException.conflito("COMUNIDADE_NOME_EM_USO", "Já existe uma comunidade com esse nome.", null);
            }
            comunidade.nome = nome.trim();
        }
        if (descricao != null) {
            comunidade.descricao = descricao.isBlank() ? null : descricao;
        }
        comunidade.atualizadoEm = Instant.now();

        auditoriaService.registrar(solicitanteId, "comunidades", "COMUNIDADE_EDITADA", "Comunidade", comunidade.id,
                null);
        return comunidade;
    }

    /**
     * Story 2.6 (RF31) — exclusão lógica: some das listagens e deixa de aceitar interações.
     * Os dados ficam preservados e o nome continua reservado ({@code nome} é {@code unique}).
     */
    @Transactional
    public void excluir(Long solicitanteId, Long comunidadeId) {
        Comunidade comunidade = buscarOuFalhar(comunidadeId);
        validarAdministrador(comunidade, solicitanteId);

        comunidade.ativa = false;
        comunidade.atualizadoEm = Instant.now();

        auditoriaService.registrar(solicitanteId, "comunidades", "COMUNIDADE_EXCLUIDA", "Comunidade", comunidade.id,
                null);
    }

    /** Story 2.6 (RF29) — só membros veem a lista; página fora da faixa é trazida para dentro dela. */
    public PageResponse<ComunidadeMembro> listarMembros(Long solicitanteId, Long comunidadeId, int pagina,
            int tamanho) {
        Comunidade comunidade = buscarOuFalhar(comunidadeId);
        if (!souMembro(comunidade, solicitanteId)) {
            throw ApiException.semPermissao("NAO_E_MEMBRO", "Só membros da comunidade veem os membros.", null);
        }
        int paginaValida = Math.max(pagina, 0);
        int tamanhoValido = Math.clamp(tamanho, 1, TAMANHO_MAXIMO_PAGINA);
        List<ComunidadeMembro> conteudo = comunidadeMembroRepository.listarPorComunidade(comunidade, paginaValida,
                tamanhoValido);
        long total = comunidadeMembroRepository.contarMembros(comunidade);
        return PageResponse.de(conteudo, paginaValida, tamanhoValido, total);
    }

    /** Story 2.5 (RF27, RF28). */
    public PageResponse<Comunidade> listar(TipoComunidade tipo, String nome, int pagina, int tamanho) {
        List<Comunidade> conteudo = comunidadeRepository.listar(tipo, nome, pagina, tamanho);
        long total = comunidadeRepository.contar(tipo, nome);
        return PageResponse.de(conteudo, pagina, tamanho, total);
    }

    /**
     * Home ("Suas comunidades" na barra lateral) — sem paginação de propósito: é o
     * conjunto de comunidades do próprio usuário, tende a ser pequeno. Devolve a associação
     * para a resposta saber o papel sem uma consulta por comunidade.
     */
    public List<ComunidadeMembro> minhasComunidades(Long usuarioId) {
        return comunidadeMembroRepository.listarPorUsuario(usuarioId);
    }

    /** Story 2.5 (RF27.1) — {@code usuarioId} nulo não deveria acontecer (endpoint autenticado). */
    public Comunidade buscarOuFalhar(Long comunidadeId) {
        return comunidadeRepository.buscarAtivaPorId(comunidadeId)
                .orElseThrow(() -> ApiException.naoEncontrado("COMUNIDADE_NAO_ENCONTRADA",
                        "Comunidade não encontrada.", null));
    }

    public boolean souMembro(Comunidade comunidade, Long usuarioId) {
        return comunidadeMembroRepository.existeAssociacao(comunidade, usuarioId);
    }

    public boolean souAdministrador(Comunidade comunidade, Long usuarioId) {
        return comunidadeMembroRepository.ehAdministrador(comunidade, usuarioId);
    }

    private Comunidade buscarAbertaOuFalhar(Long comunidadeId) {
        Comunidade comunidade = buscarOuFalhar(comunidadeId);
        if (comunidade.tipo != TipoComunidade.ABERTA) {
            throw ApiException.semPermissao("COMUNIDADE_TIPO_INVALIDO",
                    "Só é possível entrar ou sair de comunidades abertas.", null);
        }
        return comunidade;
    }

    private void validarAdministrador(Comunidade comunidade, Long usuarioId) {
        if (!comunidadeMembroRepository.ehAdministrador(comunidade, usuarioId)) {
            throw ApiException.semPermissao("SEM_PERMISSAO_ADMINISTRAR",
                    "Só o administrador da comunidade pode fazer isso.", null);
        }
    }

    private void validarNomeObrigatorio(String nome) {
        if (nome == null || nome.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe o nome da comunidade.", "nome");
        }
    }
}
