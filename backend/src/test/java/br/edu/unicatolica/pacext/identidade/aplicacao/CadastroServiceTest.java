package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.identidade.UsuarioCadastrado;
import br.edu.unicatolica.pacext.identidade.dominio.Curso;
import br.edu.unicatolica.pacext.identidade.dominio.CursoRepository;
import br.edu.unicatolica.pacext.identidade.dominio.GeradorTokenConfirmacao;
import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.email.EmailService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import jakarta.enterprise.event.Event;
import jakarta.ws.rs.core.Response;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Testa {@link CadastroService} isoladamente com Mockito (sem subir o runtime do
 * Quarkus/Postgres — mesmo motivo de {@code JwtSecurityFilterTest}). Cobre cada critério
 * de aceite da Story 1.2.
 */
class CadastroServiceTest {

    private static final String EMAIL_INSTITUCIONAL = "aluno@catolicasc.edu.br";
    private static final String SENHA_VALIDA = "senha123";
    private static final LocalDate NASCIMENTO_MAIOR_IDADE = LocalDate.now().minusYears(20);
    private static final Long CURSO_ID = 14L;

    private CadastroService service;
    private UsuarioRepository usuarioRepository;
    private Event<UsuarioCadastrado> usuarioCadastrado;
    private EmailService emailService;
    private AuditoriaService auditoriaService;

    @BeforeEach
    void setUp() {
        service = new CadastroService();
        usuarioRepository = mock(UsuarioRepository.class);
        usuarioCadastrado = mockEvent();
        emailService = mock(EmailService.class);
        auditoriaService = mock(AuditoriaService.class);

        service.usuarioRepository = usuarioRepository;
        CursoService cursoService = new CursoService();
        cursoService.cursoRepository = mock(CursoRepository.class);
        service.cursoService = cursoService;
        Curso curso = new Curso();
        curso.id = CURSO_ID;
        curso.nome = "Engenharia de Software";
        when(cursoService.cursoRepository.buscarAtivo(CURSO_ID)).thenReturn(Optional.of(curso));
        service.passwordHasher = new PasswordHasher();
        service.geradorTokenConfirmacao = new GeradorTokenConfirmacao();
        service.usuarioCadastrado = usuarioCadastrado;
        service.emailService = emailService;
        service.auditoriaService = auditoriaService;
        service.dominioInstitucional = "catolicasc.edu.br";
        service.senhaTamanhoMinimo = 8;
        service.tokenValidadeHoras = 24;
        service.frontendUrl = "http://localhost:4200";

        // Simula o IDENTITY do banco, que o mock de repository não faz sozinho.
        doAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuario.id = 42L;
            return null;
        }).when(usuarioRepository).persist(any(Usuario.class));
    }

    @Test
    void cadastraComSucessoQuandoTodosOsDadosSaoValidos() {
        Usuario usuario = service.cadastrar("Ana Silva", EMAIL_INSTITUCIONAL, SENHA_VALIDA, CURSO_ID,
                NASCIMENTO_MAIOR_IDADE);

        assertEquals("ana silva", usuario.nome.toLowerCase()); // normalização não altera capitalização, só trim
        assertEquals(EMAIL_INSTITUCIONAL, usuario.email);
        assertFalse(usuario.emailConfirmado); // RF01.2 — nenhuma sessão ativa/confirmação automática
        assertEquals("ALUNO", usuario.perfil);
        assertNotNull(usuario.tokenConfirmacaoEmail);
        assertEquals(CURSO_ID, usuario.cursoId);
        assertEquals("Engenharia de Software", usuario.curso); // nome oficial, não o texto digitado

        verify(usuarioCadastrado).fire(new UsuarioCadastrado(42L, "Engenharia de Software"));
        verify(emailService).enviarConfirmacaoCadastro(eq(EMAIL_INSTITUCIONAL), anyString(), anyString());
        verify(auditoriaService).registrar(eq(42L), eq("identidade"), eq("CADASTRO_REALIZADO"), eq("Usuario"),
                eq(42L), isNull());
    }

    @Test
    void rejeitaEmailDeDominioExterno() {
        ApiException erro = assertThrows(ApiException.class, () -> service.cadastrar("Ana Silva",
                "ana@gmail.com", SENHA_VALIDA, CURSO_ID, NASCIMENTO_MAIOR_IDADE));

        assertEquals(422, erro.getStatus());
        assertEquals("EMAIL_DOMINIO_EXTERNO", erro.getCode());
        assertEquals("Use seu e-mail institucional para se cadastrar.", erro.getMessage());
        verify(usuarioRepository, never()).persist(any(Usuario.class));
    }

    @Test
    void rejeitaEmailJaCadastrado() {
        when(usuarioRepository.existePorEmail(EMAIL_INSTITUCIONAL)).thenReturn(true);

        ApiException erro = assertThrows(ApiException.class, () -> service.cadastrar("Ana Silva",
                EMAIL_INSTITUCIONAL, SENHA_VALIDA, CURSO_ID, NASCIMENTO_MAIOR_IDADE));

        assertEquals(Response.Status.CONFLICT.getStatusCode(), erro.getStatus());
        assertEquals("EMAIL_JA_CADASTRADO", erro.getCode());
        assertEquals("Esse e-mail já tem uma conta. Esqueceu a senha?", erro.getMessage());
        verify(usuarioRepository, never()).persist(any(Usuario.class));
    }

    @Test
    void rejeitaSenhaForaDaPolitica() {
        ApiException erro = assertThrows(ApiException.class, () -> service.cadastrar("Ana Silva",
                EMAIL_INSTITUCIONAL, "123", CURSO_ID, NASCIMENTO_MAIOR_IDADE));

        assertEquals(422, erro.getStatus());
        assertEquals("SENHA_POLITICA_INVALIDA", erro.getCode());
    }

    @Test
    void rejeitaMenorDeDezoitoAnos() {
        LocalDate nascimentoMenorDeIdade = LocalDate.now().minusYears(17);

        ApiException erro = assertThrows(ApiException.class, () -> service.cadastrar("Ana Silva",
                EMAIL_INSTITUCIONAL, SENHA_VALIDA, CURSO_ID, nascimentoMenorDeIdade));

        assertEquals(422, erro.getStatus());
        assertEquals("IDADE_MINIMA_NAO_ATENDIDA", erro.getCode());
        verify(usuarioRepository, never()).persist(any(Usuario.class));
    }

    @Test
    void rejeitaCursoInexistenteOuInativo() {
        ApiException erro = assertThrows(ApiException.class, () -> service.cadastrar("Ana Silva",
                EMAIL_INSTITUCIONAL, SENHA_VALIDA, 999L, NASCIMENTO_MAIOR_IDADE));

        assertEquals(422, erro.getStatus());
        assertEquals("CURSO_INVALIDO", erro.getCode());
        assertEquals("cursoId", erro.getDetails());
        verify(usuarioRepository, never()).persist(any(Usuario.class));
    }

    @SuppressWarnings("unchecked")
    private static Event<UsuarioCadastrado> mockEvent() {
        return mock(Event.class);
    }
}
