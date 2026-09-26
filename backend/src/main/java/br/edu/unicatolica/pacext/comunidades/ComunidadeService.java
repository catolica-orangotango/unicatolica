package br.edu.unicatolica.pacext.comunidades;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;

/**
 * Regras de negócio das Stories 2.1 (admin pré-cria comunidade de curso), 2.2 (criar
 * comunidade aberta), 2.4 (entrar/sair) e 2.5 (listar/filtrar/visualizar) do Epic 2.
 * Story 2.6 (administração de comunidade) fica de fora desta fatia, ver
 * docs/decisoes/2026-08-modelo-epico-2-comunidades.md.
 */
@ApplicationScoped
public class ComunidadeService {

    @Inject
    ComunidadeRepository comunidadeRepository;

    @Inject
    ComunidadeMembroRepository comunidadeMembroRepository;

    @Inject
    AuditoriaService auditoriaService;

    /**
     * Story 2.2 (RF21, RF22, RF23). Toda comunidade criada por aqui é {@code ABERTA} —
     * o tipo {@code CURSO} só existe hoje via seed de migration (Story 2.1, protótipo);
     * o endpoint não aceita tipo no corpo de propósito, para não abrir brecha da RF21.2
     * (aluno não pode criar comunidade de curso) antes do papel ADMINISTRADOR existir.
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

    /**
     * Story 2.1 (RF21.1, RF21.2, RF22) — só chamado pelo {@code Resource} depois de
     * confirmar o perfil ADMINISTRADOR (checagem HTTP, mesmo padrão de
     * {@code UsuarioResource#porId}). Tipo {@code CURSO} é fixo e imutável; sem
     * {@code ComunidadeMembro} pro administrador — comunidade de curso não tem botão
     * "participar" (RF21.1), a associação do aluno é só via auto-join no cadastro
     * (Story 2.3).
     */
    @Transactional
    public Comunidade criarComunidadeCurso(Long usuarioId, String nome, String descricao) {
        validarNomeObrigatorio(nome);
        if (comunidadeRepository.existePorNome(nome)) {
            throw ApiException.conflito("COMUNIDADE_NOME_EM_USO", "Já existe uma comunidade com esse nome.", null);
        }

        Comunidade comunidade = new Comunidade();
        comunidade.nome = nome.trim();
        comunidade.descricao = descricao;
        comunidade.tipo = TipoComunidade.CURSO;
        comunidade.criadoPorUsuarioId = usuarioId;
        comunidade.criadoEm = Instant.now();
        comunidadeRepository.persist(comunidade);

        auditoriaService.registrar(usuarioId, "comunidades", "COMUNIDADE_CURSO_CRIADA", "Comunidade", comunidade.id,
                null);
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

    /** Story 2.4 (RF26). */
    @Transactional
    public void sair(Long usuarioId, Long comunidadeId) {
        Comunidade comunidade = buscarOuFalhar(comunidadeId);
        comunidadeMembroRepository.removerAssociacao(comunidade, usuarioId);
    }

    /** Story 2.5 (RF27, RF28). */
    public PageResponse<Comunidade> listar(TipoComunidade tipo, String nome, int pagina, int tamanho) {
        List<Comunidade> conteudo = comunidadeRepository.listar(tipo, nome, pagina, tamanho);
        long total = comunidadeRepository.contar(tipo, nome);
        return PageResponse.de(conteudo, pagina, tamanho, total);
    }

    /**
     * Home ("Suas comunidades" na barra lateral) — sem paginação de propósito: é o
     * conjunto de comunidades do próprio usuário, tende a ser pequeno.
     */
    public List<Comunidade> minhasComunidades(Long usuarioId) {
        return comunidadeMembroRepository.listarPorUsuario(usuarioId).stream()
                .map(membro -> membro.comunidade)
                .toList();
    }

    /** Story 2.5 (RF27.1) — {@code usuarioId} nulo não deveria acontecer (endpoint autenticado). */
    public Comunidade buscarOuFalhar(Long comunidadeId) {
        return comunidadeRepository.findByIdOptional(comunidadeId)
                .orElseThrow(() -> ApiException.naoEncontrado("COMUNIDADE_NAO_ENCONTRADA",
                        "Comunidade não encontrada.", null));
    }

    public boolean souMembro(Comunidade comunidade, Long usuarioId) {
        return comunidadeMembroRepository.existeAssociacao(comunidade, usuarioId);
    }

    private Comunidade buscarAbertaOuFalhar(Long comunidadeId) {
        Comunidade comunidade = buscarOuFalhar(comunidadeId);
        if (comunidade.tipo != TipoComunidade.ABERTA) {
            throw ApiException.semPermissao("COMUNIDADE_TIPO_INVALIDO",
                    "Só é possível entrar ou sair de comunidades abertas.", null);
        }
        return comunidade;
    }

    private void validarNomeObrigatorio(String nome) {
        if (nome == null || nome.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe o nome da comunidade.", "nome");
        }
    }
}
