package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.identidade.LoginRealizado;
import br.edu.unicatolica.pacext.identidade.dominio.CredenciaisInvalidasException;
import br.edu.unicatolica.pacext.identidade.dominio.EmailNaoConfirmadoException;
import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.event.Event;
import io.smallrye.jwt.auth.principal.DefaultJWTParser;
import io.smallrye.jwt.auth.principal.JWTAuthContextInfo;
import io.smallrye.jwt.util.KeyUtils;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Testa {@link AuthService} isoladamente (sem Docker/Dev Services, mesmo padrão de
 * {@code JwtSecurityFilterTest}) — repositório mockado via Mockito, par de chaves gerado
 * em memória a cada execução (nenhuma chave, de teste ou não, fica commitada no repo).
 */
class AuthServiceTest {

    private static final String ISSUER = "https://pacext.unicatolica.edu.br";

    private static PrivateKey privateKey;
    private static PublicKey publicKey;

    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final AuditoriaService auditoriaService = mock(AuditoriaService.class);
    @SuppressWarnings("unchecked")
    private final Event<LoginRealizado> loginRealizado = mock(Event.class);
    private final AuthService authService = new AuthService();

    @BeforeAll
    static void carregarChaves() throws Exception {
        KeyPair par = KeyUtils.generateKeyPair(2048);
        privateKey = par.getPrivate();
        publicKey = par.getPublic();
    }

    AuthServiceTest() {
        authService.usuarioRepository = usuarioRepository;
        authService.passwordHasher = new PasswordHasher();
        authService.auditoriaService = auditoriaService;
        authService.loginRealizado = loginRealizado;
        authService.privateKey = privateKey;
        authService.issuer = ISSUER;
    }

    private Usuario usuarioConfirmado(String senha) {
        Usuario usuario = new Usuario();
        usuario.id = 42L;
        usuario.email = "aluno.teste@catolicasc.edu.br";
        usuario.senhaHash = authService.passwordHasher.gerarHash(senha);
        usuario.perfil = "ALUNO";
        usuario.emailConfirmado = true;
        return usuario;
    }

    @Test
    void autenticaEEmiteTokenComSubERolesParaCredenciaisValidas() throws Exception {
        Usuario usuario = usuarioConfirmado("Senha123!");
        when(usuarioRepository.buscarPorEmail(usuario.email)).thenReturn(Optional.of(usuario));

        String token = authService.autenticar(usuario.email, "Senha123!");

        JWTAuthContextInfo contextInfo = new JWTAuthContextInfo(publicKey, ISSUER);
        contextInfo.setGroupsPath("roles");
        JsonWebToken jwt = new DefaultJWTParser(contextInfo).parse(token);
        assertEquals("42", jwt.getSubject());
        assertEquals(Set.of("ALUNO"), jwt.getGroups());
    }

    /**
     * Defeito D3: {@code jwt.getGroups()} passa mesmo se o token carregar a claim padrão
     * {@code groups} em vez de uma claim literalmente chamada {@code roles} — a AD-2
     * promete {@code roles} por nome ("Claims fixos no token: sub [...] e roles"), e
     * {@code smallrye.jwt.path.groups=roles} só funciona hoje por coincidência (fallback
     * silencioso do SmallRye para {@code groups} quando o path configurado não resolve).
     * Este teste lê o payload cru do token (sem passar por {@code getGroups()}, que
     * mascara o problema) para provar a claim certa está presente por nome.
     */
    @Test
    void tokenEmitidoTemClaimRolesLiteralNaoApenasGroups() throws Exception {
        Usuario usuario = usuarioConfirmado("Senha123!");
        when(usuarioRepository.buscarPorEmail(usuario.email)).thenReturn(Optional.of(usuario));

        String token = authService.autenticar(usuario.email, "Senha123!");

        String[] partes = token.split("\\.");
        String payloadJson = new String(Base64.getUrlDecoder().decode(partes[1]));
        Map<?, ?> payload = new ObjectMapper().readValue(payloadJson, Map.class);
        assertEquals(java.util.List.of("ALUNO"), payload.get("roles"));
    }

    @Test
    void registraEventoDeAuditoriaAoAutenticarComSucesso() {
        Usuario usuario = usuarioConfirmado("Senha123!");
        when(usuarioRepository.buscarPorEmail(usuario.email)).thenReturn(Optional.of(usuario));

        authService.autenticar(usuario.email, "Senha123!");

        verify(auditoriaService).registrar(eq(42L), eq("identidade"), eq("LOGIN"), any());
    }

    @Test
    void autenticarIncrementaTotalLoginsEDisparaLoginRealizadoParaAluno() {
        Usuario usuario = usuarioConfirmado("Senha123!");
        usuario.totalLogins = 1;
        when(usuarioRepository.buscarPorEmail(usuario.email)).thenReturn(Optional.of(usuario));

        authService.autenticar(usuario.email, "Senha123!");

        assertEquals(2, usuario.totalLogins);
        verify(loginRealizado).fire(new LoginRealizado(42L, 2));
    }

    @Test
    void autenticarNaoDisparaLoginRealizadoParaModeradorOuAdministrador() {
        Usuario usuario = usuarioConfirmado("Senha123!");
        usuario.perfil = "MODERADOR";
        when(usuarioRepository.buscarPorEmail(usuario.email)).thenReturn(Optional.of(usuario));

        authService.autenticar(usuario.email, "Senha123!");

        assertEquals(1, usuario.totalLogins);
        verify(loginRealizado, never()).fire(any());
    }

    @Test
    void rejeitaComCredenciaisInvalidasQuandoEmailNaoExiste() {
        when(usuarioRepository.buscarPorEmail("desconhecido@catolicasc.edu.br")).thenReturn(Optional.empty());

        assertThrows(CredenciaisInvalidasException.class,
                () -> authService.autenticar("desconhecido@catolicasc.edu.br", "qualquer"));
    }

    @Test
    void rejeitaComCredenciaisInvalidasQuandoSenhaEstaErrada() {
        Usuario usuario = usuarioConfirmado("Senha123!");
        when(usuarioRepository.buscarPorEmail(usuario.email)).thenReturn(Optional.of(usuario));

        assertThrows(CredenciaisInvalidasException.class,
                () -> authService.autenticar(usuario.email, "senha-errada"));
    }

    @Test
    void rejeitaComEmailNaoConfirmadoQuandoCredencialEstaCorreta() {
        Usuario usuario = usuarioConfirmado("Senha123!");
        usuario.emailConfirmado = false;
        when(usuarioRepository.buscarPorEmail(usuario.email)).thenReturn(Optional.of(usuario));

        assertThrows(EmailNaoConfirmadoException.class,
                () -> authService.autenticar(usuario.email, "Senha123!"));
    }

    @Test
    void rejeitaComCredenciaisInvalidasQuandoSenhaErradaMesmoComEmailNaoConfirmado() {
        // Senha errada nunca deve revelar que o e-mail existe mas está pendente de
        // confirmação — sempre CredenciaisInvalidasException (RF07/anti-enumeração).
        Usuario usuario = usuarioConfirmado("Senha123!");
        usuario.emailConfirmado = false;
        when(usuarioRepository.buscarPorEmail(usuario.email)).thenReturn(Optional.of(usuario));

        assertThrows(CredenciaisInvalidasException.class,
                () -> authService.autenticar(usuario.email, "senha-errada"));
    }

    @Test
    void logoutGravaSessaoValidaDesdeERegistraAuditoria() {
        Usuario usuario = usuarioConfirmado("Senha123!");
        when(usuarioRepository.findById(42L)).thenReturn(usuario);
        Instant antes = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);

        authService.logout(42L);

        assertNotNull(usuario.sessaoValidaDesde);
        assertFalse(usuario.sessaoValidaDesde.isBefore(antes));
        verify(auditoriaService).registrar(eq(42L), eq("identidade"), eq("LOGOUT"), any());
    }

    @Test
    void logoutTruncaSessaoValidaDesdeParaSegundosParaCasarComPrecisaoDoIat() {
        // O claim `iat` do JWT (NumericDate) só tem precisão de segundo. Sem truncar
        // sessaoValidaDesde do mesmo jeito, um login no mesmo segundo de um logout
        // anterior gerava um iat "antes" do sessaoValidaDesde sub-segundo, e
        // SessaoInvalidadaFilter rejeitava por engano uma sessão recém-criada.
        Usuario usuario = usuarioConfirmado("Senha123!");
        when(usuarioRepository.findById(42L)).thenReturn(usuario);

        authService.logout(42L);

        assertEquals(usuario.sessaoValidaDesde,
                usuario.sessaoValidaDesde.truncatedTo(java.time.temporal.ChronoUnit.SECONDS));
    }

    @Test
    void logoutNaoFalhaParaUsuarioInexistente() {
        when(usuarioRepository.findById(99L)).thenReturn(null);

        authService.logout(99L);
    }
}
