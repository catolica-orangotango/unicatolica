package br.edu.unicatolica.pacext.perfil.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.perfil.aplicacao.PerfilCompleto;
import br.edu.unicatolica.pacext.perfil.aplicacao.PerfilService;
import jakarta.ws.rs.core.Response;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Testa {@link PerfilResource} chamando os métodos diretamente — mesmo padrão de
 * {@code ComunidadeResourceTest}/{@code UsuarioResourceTest}.
 */
class PerfilResourceTest {

    private final PerfilService perfilService = mock(PerfilService.class);
    private final UsuarioAutenticado usuarioAutenticado = mock(UsuarioAutenticado.class);
    private final PerfilResource resource = new PerfilResource();

    PerfilResourceTest() {
        resource.perfilService = perfilService;
        resource.usuarioAutenticado = usuarioAutenticado;
    }

    @Test
    void meDevolveOPerfilDoUsuarioAutenticado() {
        when(usuarioAutenticado.id()).thenReturn(1L);
        when(perfilService.buscarProprio(1L))
                .thenReturn(new PerfilCompleto(1L, "Ana", "Direito", 3, List.of("IA")));

        Response response = resource.me();

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        PerfilResponse corpo = (PerfilResponse) response.getEntity();
        assertEquals("Ana", corpo.nome());
        assertEquals(3, corpo.periodo());
        assertEquals(List.of("IA"), corpo.interesses());
    }

    @Test
    void salvarDelegaAoServiceComOIdDoUsuarioAutenticado() {
        when(usuarioAutenticado.id()).thenReturn(1L);
        when(perfilService.salvar(1L, "Ana Paula", "Engenharia de Software", 5, List.of("IA", "Robótica")))
                .thenReturn(new PerfilCompleto(1L, "Ana Paula", "Engenharia de Software", 5, List.of("IA", "Robótica")));

        Response response = resource
                .salvar(new PerfilRequest("Ana Paula", "Engenharia de Software", 5, List.of("IA", "Robótica")));

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        PerfilResponse corpo = (PerfilResponse) response.getEntity();
        assertEquals("Engenharia de Software", corpo.curso());
    }

    @Test
    void porUsuarioIdDevolveOPerfilPublicoDoIdInformado() {
        when(perfilService.buscarPublico(7L)).thenReturn(new PerfilCompleto(7L, "Beto", null, null, List.of()));

        Response response = resource.porUsuarioId(7L);

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        PerfilResponse corpo = (PerfilResponse) response.getEntity();
        assertEquals(7L, corpo.usuarioId());
        assertEquals("Beto", corpo.nome());
    }
}
