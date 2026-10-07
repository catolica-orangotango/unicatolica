package br.edu.unicatolica.pacext.identidade.web;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.identidade.aplicacao.AuthService;
import br.edu.unicatolica.pacext.identidade.dominio.CredenciaisInvalidasException;
import br.edu.unicatolica.pacext.identidade.dominio.EmailNaoConfirmadoException;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuarioAutenticado;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiExceptionMapper;
import br.edu.unicatolica.pacext.compartilhado.erro.ErroResponse;
import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.mockito.Mockito;

/**
 * Testa {@link AuthResource} chamando o método diretamente (sem subir o runtime JAX-RS
 * completo — mesmo padrão de {@code JwtSecurityFilterTest}, sem Docker disponível).
 */
class AuthResourceTest {

    private final AuthService authService = mock(AuthService.class);
    private final UsuarioAutenticado usuarioAutenticado = mock(UsuarioAutenticado.class);
    private final AuthResource resource = new AuthResource();

    AuthResourceTest() {
        resource.authService = authService;
        resource.usuarioAutenticado = usuarioAutenticado;
    }

    @Test
    void retorna200ComTokenParaCredenciaisValidas() {
        when(authService.autenticar("aluno@catolicasc.edu.br", "Senha123!")).thenReturn("token-jwt-emitido");

        Response response = resource.login(new LoginRequest("aluno@catolicasc.edu.br", "Senha123!"));

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        LoginResponse corpo = (LoginResponse) response.getEntity();
        assertEquals("token-jwt-emitido", corpo.token());
    }

    @Test
    void retorna401ComEnvelopeDeErroParaCredenciaisInvalidas() {
        when(authService.autenticar(Mockito.anyString(), Mockito.anyString()))
                .thenThrow(new CredenciaisInvalidasException());

        Response response = respostaDoErro(
                () -> resource.login(new LoginRequest("aluno@catolicasc.edu.br", "senha-errada")));

        assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), response.getStatus());
        ErroResponse corpo = (ErroResponse) response.getEntity();
        assertNotNull(corpo.error());
        assertEquals("CREDENCIAL_INVALIDA", corpo.error().code());
    }

    @Test
    void retorna401ComMensagemDistintaParaEmailNaoConfirmado() {
        when(authService.autenticar(Mockito.anyString(), Mockito.anyString()))
                .thenThrow(new EmailNaoConfirmadoException());

        Response response = respostaDoErro(
                () -> resource.login(new LoginRequest("aluno@catolicasc.edu.br", "Senha123!")));

        assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), response.getStatus());
        ErroResponse corpo = (ErroResponse) response.getEntity();
        assertEquals("EMAIL_NAO_CONFIRMADO", corpo.error().code());
        assertEquals("Confirme seu e-mail antes de entrar. Reenviar confirmação", corpo.error().message());
    }

    @Test
    void retorna204NoContentAoDeslogarUsuarioAutenticado() {
        when(usuarioAutenticado.id()).thenReturn(42L);

        Response response = resource.logout();

        assertEquals(Response.Status.NO_CONTENT.getStatusCode(), response.getStatus());
        verify(authService).logout(42L);
    }

    @Test
    void retorna200ComTokenNovoAoRenovarSessao() {
        when(usuarioAutenticado.id()).thenReturn(42L);
        when(authService.renovar(42L)).thenReturn("token-renovado");

        Response response = resource.refresh();

        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        assertEquals("token-renovado", ((LoginResponse) response.getEntity()).token());
    }

    /** O Resource deixa a {@link ApiException} subir; o mapper monta o envelope (AD-5). */
    private static Response respostaDoErro(Executable chamada) {
        return new ApiExceptionMapper().toResponse(assertThrows(ApiException.class, chamada));
    }
}
