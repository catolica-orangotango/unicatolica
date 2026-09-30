package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.identidade.CursoDoUsuarioAlterado;
import br.edu.unicatolica.pacext.identidade.DadosCadastrais;
import br.edu.unicatolica.pacext.identidade.dominio.Curso;
import br.edu.unicatolica.pacext.identidade.dominio.CursoRepository;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import jakarta.enterprise.event.Event;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Testa {@link UsuarioCadastroImpl}: grava nome e curso e avisa a troca de curso. */
class UsuarioCadastroImplTest {

    private UsuarioCadastroImpl impl;
    private CursoRepository cursoRepository;
    private Event<CursoDoUsuarioAlterado> evento;
    private Usuario usuario;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        impl = new UsuarioCadastroImpl();
        impl.usuarioRepository = mock(UsuarioRepository.class);
        cursoRepository = mock(CursoRepository.class);
        CursoService cursoService = new CursoService();
        cursoService.cursoRepository = cursoRepository;
        impl.cursoService = cursoService;
        evento = mock(Event.class);
        impl.cursoDoUsuarioAlterado = evento;

        usuario = new Usuario();
        usuario.id = 42L;
        usuario.nome = "Ana";
        usuario.cursoId = 1L;
        usuario.curso = "Administração";
        when(impl.usuarioRepository.findByIdOptional(42L)).thenReturn(Optional.of(usuario));
        when(cursoRepository.buscarAtivo(14L)).thenReturn(Optional.of(curso(14L, "Engenharia de Software")));
    }

    @Test
    void trocarCursoGravaONomeOficialEDisparaOEvento() {
        DadosCadastrais dados = impl.atualizarNomeECurso(42L, "  Ana Lima ", 14L);

        assertEquals("Ana Lima", usuario.nome);
        assertEquals(14L, usuario.cursoId);
        assertEquals("Engenharia de Software", usuario.curso);
        assertEquals(new DadosCadastrais(42L, "Ana Lima", 14L, "Engenharia de Software"), dados);
        verify(evento).fire(new CursoDoUsuarioAlterado(42L, "Administração", "Engenharia de Software"));
    }

    @Test
    void mesmoCursoNaoValidaDeNovoNemDisparaEvento() {
        // Curso 1 pode até estar inativo: quem já está nele continua.
        impl.atualizarNomeECurso(42L, "Ana Lima", 1L);

        verify(cursoRepository, never()).buscarAtivo(any());
        verify(evento, never()).fire(any());
        assertEquals("Administração", usuario.curso);
    }

    @Test
    void contaSemCursoReconhecidoTrocaSemCursoAnterior() {
        usuario.cursoId = null;
        usuario.curso = "texto antigo digitado";

        impl.atualizarNomeECurso(42L, "Ana", 14L);

        verify(evento).fire(new CursoDoUsuarioAlterado(42L, null, "Engenharia de Software"));
    }

    @Test
    void cursoInativoOuInexistenteDa422() {
        when(cursoRepository.buscarAtivo(99L)).thenReturn(Optional.empty());

        ApiException erro = assertThrows(ApiException.class, () -> impl.atualizarNomeECurso(42L, "Ana", 99L));

        assertEquals("CURSO_INVALIDO", erro.getCode());
        verify(evento, never()).fire(any());
    }

    @Test
    void usuarioInexistenteDa404() {
        ApiException erro = assertThrows(ApiException.class, () -> impl.atualizarNomeECurso(7L, "Ana", 14L));

        assertEquals(404, erro.getStatus());
        assertEquals("USUARIO_NAO_ENCONTRADO", erro.getCode());
    }

    @Test
    void buscarDevolveCursoNuloParaContaSemCursoReconhecido() {
        usuario.cursoId = null;
        usuario.curso = "texto antigo digitado";

        assertEquals(new DadosCadastrais(42L, "Ana", null, null), impl.buscar(42L).orElseThrow());
    }

    private static Curso curso(Long id, String nome) {
        Curso curso = new Curso();
        curso.id = id;
        curso.nome = nome;
        return curso;
    }
}
