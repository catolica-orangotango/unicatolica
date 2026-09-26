package br.edu.unicatolica.pacext.perfil.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.identidade.UsuarioAtualizacao;
import br.edu.unicatolica.pacext.identidade.UsuarioConsulta;
import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademico;
import br.edu.unicatolica.pacext.perfil.dominio.PerfilAcademicoRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Testa {@link PerfilService} isoladamente com Mockito — critérios das Stories 4.1, 4.2
 * e 4.4. Mesmo padrão de {@code ComunidadeServiceTest}.
 */
class PerfilServiceTest {

    private static final Long USUARIO_ID = 42L;

    private PerfilService service;
    private PerfilAcademicoRepository perfilAcademicoRepository;
    private UsuarioConsulta usuarioConsulta;
    private UsuarioAtualizacao usuarioAtualizacao;
    private AutoJoinCursoService autoJoinCursoService;

    @BeforeEach
    void setUp() {
        service = new PerfilService();
        perfilAcademicoRepository = mock(PerfilAcademicoRepository.class);
        usuarioConsulta = mock(UsuarioConsulta.class);
        usuarioAtualizacao = mock(UsuarioAtualizacao.class);
        autoJoinCursoService = mock(AutoJoinCursoService.class);
        service.perfilAcademicoRepository = perfilAcademicoRepository;
        service.usuarioConsulta = usuarioConsulta;
        service.usuarioAtualizacao = usuarioAtualizacao;
        service.autoJoinCursoService = autoJoinCursoService;

        doAnswer(invocation -> {
            PerfilAcademico perfil = invocation.getArgument(0);
            perfil.id = 1L;
            return null;
        }).when(perfilAcademicoRepository).persist(any(PerfilAcademico.class));
    }

    private void comResumo(Long id, String nome, String curso) {
        when(usuarioConsulta.buscarResumos(List.of(id))).thenReturn(Map.of(id, new UsuarioResumo(id, nome, curso)));
    }

    @Test
    void buscarProprioSemPerfilAindaCriadoDevolvePeriodoEInteressesVazios() {
        comResumo(USUARIO_ID, "Ana", "Direito");
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.empty());

        PerfilCompleto perfil = service.buscarProprio(USUARIO_ID);

        assertEquals("Ana", perfil.nome());
        assertEquals("Direito", perfil.curso());
        assertNull(perfil.periodo());
        assertTrue(perfil.interesses().isEmpty());
    }

    @Test
    void buscarProprioDeUsuarioInexistenteLanca404() {
        when(usuarioConsulta.buscarResumos(List.of(USUARIO_ID))).thenReturn(Map.of());

        ApiException erro = assertThrows(ApiException.class, () -> service.buscarProprio(USUARIO_ID));
        assertEquals(404, erro.getStatus());
        assertEquals("RECURSO_NAO_ENCONTRADO", erro.getCode());
    }

    @Test
    void buscarPublicoDeUsuarioInexistenteLanca404() {
        when(usuarioConsulta.buscarResumos(List.of(99L))).thenReturn(Map.of());

        assertThrows(ApiException.class, () -> service.buscarPublico(99L));
    }

    @Test
    void salvarCriaPerfilNovoEChamaAutoJoinComCursoAnterior() {
        comResumo(USUARIO_ID, "Ana", "Direito");
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.empty());

        PerfilCompleto perfil = service.salvar(USUARIO_ID, "Ana Paula", "Engenharia de Software", 3,
                List.of("IA", "Robótica"));

        verify(usuarioAtualizacao).atualizarNomeECurso(USUARIO_ID, "Ana Paula", "Engenharia de Software");
        verify(autoJoinCursoService).sincronizarCursoDoAluno(USUARIO_ID, "Direito", "Engenharia de Software");
        verify(perfilAcademicoRepository).persist(any(PerfilAcademico.class));
        assertEquals(3, perfil.periodo());
        assertEquals(List.of("IA", "Robótica"), perfil.interesses());
    }

    @Test
    void salvarComPerfilExistenteSubstituiInteressesEmVezDeAcumular() {
        comResumo(USUARIO_ID, "Ana", "Direito");
        PerfilAcademico existente = new PerfilAcademico();
        existente.id = 1L;
        existente.usuarioId = USUARIO_ID;
        existente.periodo = 1;
        existente.interesses.add(new br.edu.unicatolica.pacext.perfil.dominio.Interesse(existente, "Antigo"));
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.of(existente));

        PerfilCompleto perfil = service.salvar(USUARIO_ID, "Ana", "Direito", 5, List.of("Novo"));

        assertEquals(List.of("Novo"), perfil.interesses());
        verify(perfilAcademicoRepository, never()).persist(any(PerfilAcademico.class));
    }

    @Test
    void salvarIgnoraInteresseEmBranco() {
        comResumo(USUARIO_ID, "Ana", "Direito");
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.empty());

        PerfilCompleto perfil = service.salvar(USUARIO_ID, "Ana", "Direito", null, List.of("IA", "  ", ""));

        assertEquals(List.of("IA"), perfil.interesses());
    }

    @Test
    void salvarComNomeEmBrancoLancaCampoObrigatorio() {
        ApiException erro = assertThrows(ApiException.class,
                () -> service.salvar(USUARIO_ID, "  ", "Direito", null, List.of()));

        assertEquals("CAMPO_OBRIGATORIO", erro.getCode());
        verify(usuarioAtualizacao, never()).atualizarNomeECurso(anyLong(), any(), any());
    }

    @Test
    void salvarComCursoVazioNormalizaParaNulo() {
        comResumo(USUARIO_ID, "Ana", "Direito");
        when(perfilAcademicoRepository.buscarPorUsuarioId(USUARIO_ID)).thenReturn(Optional.empty());

        service.salvar(USUARIO_ID, "Ana", "  ", null, List.of());

        verify(usuarioAtualizacao).atualizarNomeECurso(eq(USUARIO_ID), eq("Ana"), eq(null));
        verify(autoJoinCursoService).sincronizarCursoDoAluno(USUARIO_ID, "Direito", null);
    }
}
