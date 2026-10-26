package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.CursoCadastrado;
import br.edu.unicatolica.pacext.identidade.CursoRenomeado;
import br.edu.unicatolica.pacext.identidade.dominio.Curso;
import br.edu.unicatolica.pacext.identidade.dominio.CursoRepository;
import jakarta.enterprise.event.Event;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link CursoService} isoladamente com Mockito: leitura do cadastro e administração de cursos (KAN-44). */
class CursoServiceTest {

    private static final Long ADMIN_ID = 9L;

    private CursoService service;
    private CursoRepository cursoRepository;
    private UsuarioAutenticado usuarioAutenticado;
    private AuditoriaService auditoriaService;
    private Event<CursoCadastrado> cursoCadastrado;
    private Event<CursoRenomeado> cursoRenomeado;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        service = new CursoService();
        cursoRepository = mock(CursoRepository.class);
        usuarioAutenticado = mock(UsuarioAutenticado.class);
        auditoriaService = mock(AuditoriaService.class);
        cursoCadastrado = mock(Event.class);
        cursoRenomeado = mock(Event.class);
        service.cursoRepository = cursoRepository;
        service.usuarioAutenticado = usuarioAutenticado;
        service.auditoriaService = auditoriaService;
        service.cursoCadastrado = cursoCadastrado;
        service.cursoRenomeado = cursoRenomeado;
        when(usuarioAutenticado.id()).thenReturn(ADMIN_ID);

        doAnswer(invocation -> {
            Curso curso = invocation.getArgument(0);
            curso.id = 77L;
            return null;
        }).when(cursoRepository).persist(any(Curso.class));
    }

    private static Curso curso(Long id, String nome, boolean ativo) {
        Curso curso = new Curso();
        curso.id = id;
        curso.nome = nome;
        curso.ativo = ativo;
        return curso;
    }

    private static ApiException acessoNegado() {
        return new ApiException(403, "ACESSO_NEGADO", "Acesso negado.", null);
    }

    // ---- leitura do cadastro/perfil ----

    @Test
    void devolveCursoAtivo() {
        Curso curso = new Curso();
        when(cursoRepository.buscarAtivo(7L)).thenReturn(Optional.of(curso));

        assertSame(curso, service.buscarAtivoOuFalhar(7L));
    }

    @Test
    void cursoInexistenteOuInativoDa422() {
        when(cursoRepository.buscarAtivo(7L)).thenReturn(Optional.empty());

        ApiException erro = assertThrows(ApiException.class, () -> service.buscarAtivoOuFalhar(7L));

        assertEquals(422, erro.getStatus());
        assertEquals("CURSO_INVALIDO", erro.getCode());
    }

    // ---- listar todos ----

    @Test
    void administradorListaTodosOsCursos() {
        List<Curso> todos = List.of(curso(1L, "Administração", true), curso(2L, "Direito", false));
        when(cursoRepository.listarTodos()).thenReturn(todos);

        assertSame(todos, service.listarTodos());
        verify(usuarioAutenticado).exigirAdministrador();
    }

    @Test
    void quemNaoEAdministradorNaoListaTodos() {
        doThrow(acessoNegado()).when(usuarioAutenticado).exigirAdministrador();

        ApiException erro = assertThrows(ApiException.class, () -> service.listarTodos());

        assertEquals(403, erro.getStatus());
        verify(cursoRepository, never()).listarTodos();
    }

    // ---- cadastrar ----

    @Test
    void cadastraCursoAtivoDisparaOEventoEAudita() {
        Curso curso = service.cadastrar("  Curso Teste ");

        assertEquals("Curso Teste", curso.nome);
        assertTrue(curso.ativo);
        assertNotNull(curso.criadoEm);
        verify(cursoCadastrado).fire(new CursoCadastrado(77L, "Curso Teste", ADMIN_ID));
        verify(auditoriaService).registrar(eq(ADMIN_ID), eq("identidade"), eq("CURSO_CADASTRADO"), eq("Curso"),
                eq(77L), any());
    }

    @Test
    void naoAdministradorNaoCadastra() {
        doThrow(acessoNegado()).when(usuarioAutenticado).exigirAdministrador();

        ApiException erro = assertThrows(ApiException.class, () -> service.cadastrar("Curso Teste"));

        assertEquals(403, erro.getStatus());
        verify(cursoRepository, never()).persist(any(Curso.class));
        verify(cursoCadastrado, never()).fire(any());
    }

    @Test
    void cadastroRejeitaNomeEmBrancoOuMuitoLongo() {
        ApiException vazio = assertThrows(ApiException.class, () -> service.cadastrar("   "));
        assertEquals(422, vazio.getStatus());
        assertEquals("CAMPO_OBRIGATORIO", vazio.getCode());

        ApiException longo = assertThrows(ApiException.class, () -> service.cadastrar("x".repeat(151)));
        assertEquals(422, longo.getStatus());
        assertEquals("NOME_MUITO_LONGO", longo.getCode());

        verify(cursoRepository, never()).persist(any(Curso.class));
    }

    @Test
    void cadastroRejeitaNomeJaUsadoCom409() {
        when(cursoRepository.existePorNome("Direito")).thenReturn(true);

        ApiException erro = assertThrows(ApiException.class, () -> service.cadastrar(" Direito "));

        assertEquals(409, erro.getStatus());
        assertEquals("CURSO_NOME_EM_USO", erro.getCode());
        verify(cursoRepository, never()).persist(any(Curso.class));
        verify(cursoCadastrado, never()).fire(any());
    }

    // ---- atualizar ----

    @Test
    void renomearDisparaOEventoEAudita() {
        Curso existente = curso(5L, "Direito", true);
        when(cursoRepository.findByIdOptional(5L)).thenReturn(Optional.of(existente));

        Curso atualizado = service.atualizar(5L, " Direito Noturno ", true);

        assertEquals("Direito Noturno", atualizado.nome);
        verify(cursoRenomeado).fire(new CursoRenomeado(5L, "Direito Noturno"));
        verify(auditoriaService).registrar(eq(ADMIN_ID), eq("identidade"), eq("CURSO_RENOMEADO"), eq("Curso"),
                eq(5L), any());
    }

    @Test
    void desativarNaoDisparaEventoDeRenomearEAudita() {
        Curso existente = curso(5L, "Direito", true);
        when(cursoRepository.findByIdOptional(5L)).thenReturn(Optional.of(existente));

        Curso atualizado = service.atualizar(5L, "Direito", false);

        assertFalse(atualizado.ativo);
        verify(cursoRenomeado, never()).fire(any());
        verify(auditoriaService).registrar(eq(ADMIN_ID), eq("identidade"), eq("CURSO_DESATIVADO"), eq("Curso"),
                eq(5L), any());
    }

    @Test
    void reativarAudita() {
        Curso existente = curso(5L, "Direito", false);
        when(cursoRepository.findByIdOptional(5L)).thenReturn(Optional.of(existente));

        service.atualizar(5L, "Direito", true);

        assertTrue(existente.ativo);
        verify(auditoriaService).registrar(eq(ADMIN_ID), eq("identidade"), eq("CURSO_ATIVADO"), eq("Curso"),
                eq(5L), any());
    }

    @Test
    void semMudancaNaoDisparaNadaNemAudita() {
        Curso existente = curso(5L, "Direito", true);
        when(cursoRepository.findByIdOptional(5L)).thenReturn(Optional.of(existente));

        service.atualizar(5L, "Direito", true);

        verify(cursoRenomeado, never()).fire(any());
        verify(auditoriaService, never()).registrar(any(), anyString(), anyString(), anyString(), anyLong(), any());
    }

    @Test
    void naoAdministradorNaoAtualiza() {
        doThrow(acessoNegado()).when(usuarioAutenticado).exigirAdministrador();

        ApiException erro = assertThrows(ApiException.class, () -> service.atualizar(5L, "Direito", true));

        assertEquals(403, erro.getStatus());
        verify(cursoRepository, never()).findByIdOptional(anyLong());
    }

    @Test
    void atualizarCursoInexistenteDa404() {
        when(cursoRepository.findByIdOptional(99L)).thenReturn(Optional.empty());

        ApiException erro = assertThrows(ApiException.class, () -> service.atualizar(99L, "Direito", true));

        assertEquals(404, erro.getStatus());
        assertEquals("CURSO_NAO_ENCONTRADO", erro.getCode());
    }

    @Test
    void atualizarComNomeDeOutroCursoDa409() {
        Curso existente = curso(5L, "Direito", true);
        when(cursoRepository.findByIdOptional(5L)).thenReturn(Optional.of(existente));
        when(cursoRepository.existePorNomeEDiferente("Administração", 5L)).thenReturn(true);

        ApiException erro = assertThrows(ApiException.class, () -> service.atualizar(5L, "Administração", true));

        assertEquals(409, erro.getStatus());
        assertEquals("CURSO_NOME_EM_USO", erro.getCode());
        assertEquals("Direito", existente.nome);
        verify(cursoRenomeado, never()).fire(any());
    }

    @Test
    void atualizarComNomeEmBrancoDa422() {
        Curso existente = curso(5L, "Direito", true);
        when(cursoRepository.findByIdOptional(5L)).thenReturn(Optional.of(existente));

        ApiException erro = assertThrows(ApiException.class, () -> service.atualizar(5L, " ", true));

        assertEquals(422, erro.getStatus());
        assertEquals("CAMPO_OBRIGATORIO", erro.getCode());
    }
}
