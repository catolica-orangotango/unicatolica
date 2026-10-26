package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.CursoCadastrado;
import br.edu.unicatolica.pacext.identidade.CursoRenomeado;
import br.edu.unicatolica.pacext.identidade.dominio.Curso;
import br.edu.unicatolica.pacext.identidade.dominio.CursoRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;

/**
 * Lista de cursos (decisão de 2026-09-30), lida pelo cadastro e pelo perfil, e a
 * manutenção dela pelo administrador (KAN-44): cadastrar, renomear, ativar e desativar.
 */
@ApplicationScoped
public class CursoService {

    /** Limite da coluna {@code curso.nome} e do contrato. */
    static final int TAMANHO_MAXIMO_NOME = 150;

    private static final String MODULO_AUDITORIA = "identidade";
    private static final String ENTIDADE_AUDITORIA = "Curso";
    private static final String ACAO_CADASTRADO = "CURSO_CADASTRADO";
    private static final String ACAO_RENOMEADO = "CURSO_RENOMEADO";
    private static final String ACAO_ATIVADO = "CURSO_ATIVADO";
    private static final String ACAO_DESATIVADO = "CURSO_DESATIVADO";

    @Inject
    CursoRepository cursoRepository;

    @Inject
    UsuarioAutenticado usuarioAutenticado;

    @Inject
    AuditoriaService auditoriaService;

    @Inject
    Event<CursoCadastrado> cursoCadastrado;

    @Inject
    Event<CursoRenomeado> cursoRenomeado;

    /** {@code GET /cursos} — só ativos, em ordem alfabética. */
    public List<Curso> listarAtivos() {
        return cursoRepository.listarAtivos();
    }

    /** Cadastro e perfil só aceitam curso ativo de {@code GET /cursos}. */
    public Curso buscarAtivoOuFalhar(Long cursoId) {
        return cursoRepository.buscarAtivo(cursoId)
                .orElseThrow(() -> ApiException.validacao("CURSO_INVALIDO", "Escolha um curso da lista.", "cursoId"));
    }

    /** {@code GET /admin/cursos} — todos, para o administrador reativar os desativados. */
    public List<Curso> listarTodos() {
        usuarioAutenticado.exigirAdministrador();
        return cursoRepository.listarTodos();
    }

    /**
     * {@code POST /cursos} — cria o curso ativo e dispara {@link CursoCadastrado}: Comunidades
     * cria a comunidade de curso na mesma transação (Story 2.1, RF21.2), e uma falha lá
     * (nome já usado por outra comunidade) desfaz o cadastro.
     */
    @Transactional
    public Curso cadastrar(String nome) {
        usuarioAutenticado.exigirAdministrador();
        String nomeLimpo = nomeValidoELivre(nome, null);

        Curso curso = novoCurso(nomeLimpo);
        cursoRepository.persist(curso);

        Long adminId = usuarioAutenticado.id();
        cursoCadastrado.fire(new CursoCadastrado(curso.id, curso.nome, adminId));
        auditar(adminId, ACAO_CADASTRADO, curso.id);
        return curso;
    }

    /**
     * {@code PUT /cursos/{id}} — renomeia e/ou ativa/desativa. Só renomear dispara
     * {@link CursoRenomeado}; desativar não mexe na comunidade do curso.
     */
    @Transactional
    public Curso atualizar(Long id, String nome, boolean ativo) {
        usuarioAutenticado.exigirAdministrador();
        Curso curso = buscarOuFalhar(id);
        String nomeLimpo = nomeValidoELivre(nome, curso.id);

        boolean renomeou = !nomeLimpo.equals(curso.nome);
        boolean mudouSituacao = ativo != curso.ativo;
        curso.nome = nomeLimpo;
        curso.ativo = ativo;

        Long adminId = usuarioAutenticado.id();
        if (renomeou) {
            cursoRenomeado.fire(new CursoRenomeado(curso.id, curso.nome));
            auditar(adminId, ACAO_RENOMEADO, curso.id);
        }
        if (mudouSituacao) {
            auditar(adminId, ativo ? ACAO_ATIVADO : ACAO_DESATIVADO, curso.id);
        }
        return curso;
    }

    private Curso buscarOuFalhar(Long id) {
        return cursoRepository.findByIdOptional(id)
                .orElseThrow(() -> ApiException.naoEncontrado("CURSO_NAO_ENCONTRADO", "Curso não encontrado.", null));
    }

    private static Curso novoCurso(String nome) {
        Curso curso = new Curso();
        curso.nome = nome;
        curso.criadoEm = Instant.now();
        return curso;
    }

    /**
     * Devolve o nome sem espaços nas pontas, se for válido e ainda não for de outro curso.
     * {@code idAtual} é o curso que está sendo renomeado, ou {@code null} ao cadastrar.
     */
    private String nomeValidoELivre(String nome, Long idAtual) {
        String limpo = validarNome(nome);
        boolean emUso = idAtual == null
                ? cursoRepository.existePorNome(limpo)
                : cursoRepository.existePorNomeEDiferente(limpo, idAtual);
        if (emUso) {
            throw ApiException.conflito("CURSO_NOME_EM_USO", "Já existe um curso com esse nome.", null);
        }
        return limpo;
    }

    private static String validarNome(String nome) {
        if (nome == null || nome.isBlank()) {
            throw ApiException.validacao("CAMPO_OBRIGATORIO", "Informe o nome do curso.", "nome");
        }
        String limpo = nome.strip();
        if (limpo.length() > TAMANHO_MAXIMO_NOME) {
            throw ApiException.validacao("NOME_MUITO_LONGO",
                    "O nome do curso pode ter até " + TAMANHO_MAXIMO_NOME + " caracteres.", "nome");
        }
        return limpo;
    }

    private void auditar(Long adminId, String acao, Long cursoId) {
        auditoriaService.registrar(adminId, MODULO_AUDITORIA, acao, ENTIDADE_AUDITORIA, cursoId, null);
    }
}
