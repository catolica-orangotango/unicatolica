package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.identidade.dominio.AcessoNegadoException;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Testa {@link UsuarioService}: a regra de perfil de {@code /usuarios} (Story 1.5, I/O
 * Matrix da spec) e as duas interfaces que ele expõe para fora do módulo.
 */
class UsuarioServiceTest {

    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final UsuarioAutenticado usuarioAutenticado = mock(UsuarioAutenticado.class);
    private final UsuarioService service = new UsuarioService();

    UsuarioServiceTest() {
        service.usuarioRepository = usuarioRepository;
        service.usuarioAutenticado = usuarioAutenticado;
    }

    private static Usuario usuario(Long id, String nome, String curso) {
        Usuario usuario = new Usuario();
        usuario.id = id;
        usuario.nome = nome;
        usuario.curso = curso;
        return usuario;
    }

    @Test
    void buscarProprioUsaOIdDoToken() {
        Usuario ana = usuario(1L, "Ana", null);
        when(usuarioAutenticado.id()).thenReturn(1L);
        when(usuarioRepository.findById(1L)).thenReturn(ana);

        assertEquals(ana, service.buscarProprio());
    }

    @Test
    void alunoTentandoVerOutroUsuarioLancaAcessoNegado() {
        when(usuarioAutenticado.possuiPerfil("MODERADOR")).thenReturn(false);

        assertThrows(AcessoNegadoException.class, () -> service.buscarPorId(99L));
        verify(usuarioRepository, never()).findById(any());
    }

    @Test
    void moderadorVeOutroUsuario() {
        Usuario beto = usuario(7L, "Beto", null);
        when(usuarioAutenticado.possuiPerfil("MODERADOR")).thenReturn(true);
        when(usuarioRepository.findById(7L)).thenReturn(beto);

        assertEquals(beto, service.buscarPorId(7L));
    }

    @Test
    void moderadorConsultandoIdInexistenteLanca404() {
        when(usuarioAutenticado.possuiPerfil("MODERADOR")).thenReturn(true);
        when(usuarioRepository.findById(404L)).thenReturn(null);

        ApiException erro = assertThrows(ApiException.class, () -> service.buscarPorId(404L));
        assertEquals(404, erro.getStatus());
        assertEquals("RECURSO_NAO_ENCONTRADO", erro.getCode());
    }

    @Test
    void atualizarNomeECursoGravaNoUsuarioEncontrado() {
        Usuario ana = usuario(1L, "Ana", "Direito");
        when(usuarioRepository.findById(1L)).thenReturn(ana);

        service.atualizarNomeECurso(1L, "Ana Paula", "Engenharia de Software");

        assertEquals("Ana Paula", ana.nome);
        assertEquals("Engenharia de Software", ana.curso);
    }

    @Test
    void atualizarNomeECursoDeUsuarioInexistenteLanca404() {
        when(usuarioRepository.findById(404L)).thenReturn(null);

        ApiException erro = assertThrows(ApiException.class,
                () -> service.atualizarNomeECurso(404L, "X", null));
        assertEquals("RECURSO_NAO_ENCONTRADO", erro.getCode());
    }

    @Test
    void buscarResumosIndexaPorId() {
        when(usuarioRepository.buscarPorIds(Set.of(1L, 2L, 3L)))
                .thenReturn(List.of(usuario(1L, "Ana", "Direito"), usuario(2L, "Beto", null)));

        Map<Long, UsuarioResumo> resumos = service.buscarResumos(Set.of(1L, 2L, 3L));

        assertEquals(2, resumos.size());
        assertEquals(new UsuarioResumo(1L, "Ana", "Direito"), resumos.get(1L));
        assertEquals(new UsuarioResumo(2L, "Beto", null), resumos.get(2L));
    }

    @Test
    void buscarResumosSemIdsNaoConsultaOBanco() {
        assertTrue(service.buscarResumos(List.of()).isEmpty());
        verify(usuarioRepository, never()).buscarPorIds(any());
    }

    @Test
    void sessaoValidaDesdeVaziaQuandoUsuarioNaoExiste() {
        when(usuarioRepository.findById(42L)).thenReturn(null);

        assertEquals(Optional.empty(), service.sessaoValidaDesde(42L));
    }

    @Test
    void sessaoValidaDesdeVaziaQuandoUsuarioNuncaDeslogou() {
        when(usuarioRepository.findById(42L)).thenReturn(usuario(42L, "Ana", null));

        assertEquals(Optional.empty(), service.sessaoValidaDesde(42L));
    }

    @Test
    void sessaoValidaDesdeDevolveInstanteDoUltimoLogout() {
        Instant logout = Instant.parse("2026-09-25T12:00:00Z");
        Usuario usuario = usuario(42L, "Ana", null);
        usuario.sessaoValidaDesde = logout;
        when(usuarioRepository.findById(42L)).thenReturn(usuario);

        assertEquals(Optional.of(logout), service.sessaoValidaDesde(42L));
    }
}
