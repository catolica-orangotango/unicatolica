package br.edu.unicatolica.pacext.notificacoes.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.notificacoes.TipoNotificacao;
import br.edu.unicatolica.pacext.notificacoes.aplicacao.NotificacaoService;
import br.edu.unicatolica.pacext.notificacoes.dominio.Notificacao;
import jakarta.ws.rs.core.Response;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Testa {@link NotificacaoResource} chamando os métodos diretamente (sem subir o runtime
 * JAX-RS completo — mesmo padrão de {@code AuthResourceTest}/{@code UsuarioResourceTest}).
 */
class NotificacaoResourceTest {

    private final NotificacaoService notificacaoService = mock(NotificacaoService.class);
    private final UsuarioAutenticado usuarioAutenticado = mock(UsuarioAutenticado.class);
    private final NotificacaoResource resource = new NotificacaoResource();

    NotificacaoResourceTest() {
        resource.notificacaoService = notificacaoService;
        resource.usuarioAutenticado = usuarioAutenticado;
        when(usuarioAutenticado.id()).thenReturn(42L);
    }

    @Test
    void minhasDevolveAPaginaConvertidaParaNotificacaoResponse() {
        Notificacao notificacao = new Notificacao();
        notificacao.id = 1L;
        notificacao.tipo = TipoNotificacao.ONBOARDING_PERFIL;
        notificacao.texto = "Complete seu perfil e apareça mais nas buscas - adicione seus interesses.";
        notificacao.link = "/perfil";
        notificacao.lida = false;
        notificacao.criadoEm = Instant.parse("2026-09-30T12:00:00Z");
        when(notificacaoService.listar(42L, 0, 20)).thenReturn(PageResponse.de(List.of(notificacao), 0, 20, 1));

        PageResponse<NotificacaoResponse> pagina = resource.minhas(0, 20);

        assertEquals(1, pagina.content().size());
        assertEquals("ONBOARDING_PERFIL", pagina.content().get(0).tipo());
        assertEquals(1L, pagina.totalElements());
    }

    @Test
    void marcarComoLidaChamaOServicoComOUsuarioAutenticadoEDevolve204() {
        Response response = resource.marcarComoLida(7L);

        assertEquals(204, response.getStatus());
        verify(notificacaoService).marcarComoLida(42L, 7L);
    }
}
