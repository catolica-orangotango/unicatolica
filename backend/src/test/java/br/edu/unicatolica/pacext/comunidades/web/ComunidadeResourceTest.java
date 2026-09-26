package br.edu.unicatolica.pacext.comunidades.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.comunidades.Comunidade;
import br.edu.unicatolica.pacext.comunidades.ComunidadeService;
import br.edu.unicatolica.pacext.comunidades.TipoComunidade;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/**
 * Testa {@link ComunidadeResource#criarCurso} (Story 2.1) chamando o método diretamente —
 * mesmo padrão de {@code UsuarioResourceTest} (sem subir o runtime JAX-RS completo, sem
 * Docker disponível localmente).
 */
class ComunidadeResourceTest {

    private final ComunidadeService comunidadeService = mock(ComunidadeService.class);
    private final UsuarioAutenticado usuarioAutenticado = mock(UsuarioAutenticado.class);
    private final ComunidadeResource resource = new ComunidadeResource();

    ComunidadeResourceTest() {
        resource.comunidadeService = comunidadeService;
        resource.usuarioAutenticado = usuarioAutenticado;
    }

    private static Comunidade comunidadeCurso() {
        Comunidade comunidade = new Comunidade();
        comunidade.id = 27L;
        comunidade.nome = "Fisioterapia";
        comunidade.tipo = TipoComunidade.CURSO;
        comunidade.criadoPorUsuarioId = 1L;
        comunidade.criadoEm = Instant.now();
        return comunidade;
    }

    @Test
    void alunoTentandoCriarComunidadeDeCursoLevaAcessoNegado() {
        when(usuarioAutenticado.possuiPerfil("ADMINISTRADOR")).thenReturn(false);

        ApiException erro = org.junit.jupiter.api.Assertions.assertThrows(ApiException.class,
                () -> resource.criarCurso(new ComunidadeRequest("Fisioterapia", null)));

        assertEquals("ACESSO_NEGADO", erro.getCode());
        assertEquals(Response.Status.FORBIDDEN.getStatusCode(), erro.getStatus());
        verify(comunidadeService, never()).criarComunidadeCurso(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void administradorCriaComunidadeDeCursoRetorna201SemSouMembro() {
        when(usuarioAutenticado.possuiPerfil("ADMINISTRADOR")).thenReturn(true);
        when(usuarioAutenticado.id()).thenReturn(1L);
        when(comunidadeService.criarComunidadeCurso(1L, "Fisioterapia", "Comunidade do curso"))
                .thenReturn(comunidadeCurso());

        Response response = resource.criarCurso(new ComunidadeRequest("Fisioterapia", "Comunidade do curso"));

        assertEquals(Response.Status.CREATED.getStatusCode(), response.getStatus());
        ComunidadeResponse corpo = (ComunidadeResponse) response.getEntity();
        assertEquals("Fisioterapia", corpo.nome());
        assertEquals("CURSO", corpo.tipo());
        assertEquals(Boolean.FALSE, corpo.souMembro());
    }
}
