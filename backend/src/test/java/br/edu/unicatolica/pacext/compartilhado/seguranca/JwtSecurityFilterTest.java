package br.edu.unicatolica.pacext.compartilhado.seguranca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.smallrye.jwt.auth.principal.DefaultJWTParser;
import io.smallrye.jwt.auth.principal.JWTAuthContextInfo;
import io.smallrye.jwt.build.Jwt;
import io.smallrye.jwt.util.KeyUtils;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * Testa {@link JwtSecurityFilter} isoladamente, sem subir o runtime completo do Quarkus
 * (não há Docker disponível para os Dev Services de Postgres neste ambiente) —
 * constrói o {@link io.smallrye.jwt.auth.principal.JWTParser} manualmente com um par de
 * chaves gerado em memória (nenhuma chave commitada no repo) e um {@link ContainerRequestContext}
 * mockado via Mockito, cobrindo exatamente o contrato da AD-2: allowlist
 * {@code @PermitAll}, exigência de {@code Authorization: Bearer} e das claims
 * {@code sub}/{@code roles}.
 */
class JwtSecurityFilterTest {

    private static final String ISSUER = "https://pacext.unicatolica.edu.br";

    private static PrivateKey privateKey;
    private static JwtSecurityFilter filter;

    @BeforeAll
    static void setUpParser() throws Exception {
        KeyPair par = KeyUtils.generateKeyPair(2048);
        privateKey = par.getPrivate();
        PublicKey publicKey = par.getPublic();

        JWTAuthContextInfo contextInfo = new JWTAuthContextInfo(publicKey, ISSUER);
        contextInfo.setGroupsPath("roles");

        filter = new JwtSecurityFilter();
        filter.jwtParser = new DefaultJWTParser(contextInfo);
    }

    private ContainerRequestContext mockContext(String path, String method, String authorizationHeader) {
        ContainerRequestContext requestContext = mock(ContainerRequestContext.class);
        UriInfo uriInfo = mock(UriInfo.class);
        when(uriInfo.getPath()).thenReturn(path);
        when(requestContext.getUriInfo()).thenReturn(uriInfo);
        when(requestContext.getMethod()).thenReturn(method);
        when(requestContext.getHeaderString(HttpHeaders.AUTHORIZATION)).thenReturn(authorizationHeader);
        return requestContext;
    }

    private String validToken(String subject, Set<String> roles) {
        return Jwt.claims()
                .issuer(ISSUER)
                .subject(subject)
                .claim("roles", roles)
                .sign(privateKey);
    }

    @Test
    void permiteRequisicaoNaAllowlistSemToken() throws Exception {
        ContainerRequestContext requestContext = mockContext("/q/health", "GET", null);

        filter.filter(requestContext);

        verify(requestContext, never()).abortWith(any());
    }

    /**
     * Regressão: {@code UriInfo#getPath()} do RESTEasy Reactive já retorna o path COM
     * barra inicial (diferente do RESTEasy clássico) — concatenar mais uma barra sem
     * checar produzia "//auth/login", que não batia com a allowlist e derrubava a
     * requisição com 401 mesmo em rota pública. Verificado manualmente via
     * {@code curl -X POST /auth/login} contra o servidor em dev mode antes do fix.
     */
    @Test
    void permiteAllowlistQuandoUriInfoJaRetornaComBarraInicial() throws Exception {
        ContainerRequestContext requestContext = mockContext("/auth/login", "POST", null);

        filter.filter(requestContext);

        verify(requestContext, never()).abortWith(any());
    }

    @Test
    void permiteRequisicaoAuthLoginSemToken() throws Exception {
        ContainerRequestContext requestContext = mockContext("/auth/login", "POST", null);

        filter.filter(requestContext);

        verify(requestContext, never()).abortWith(any());
    }

    @Test
    void permiteListarCursosSemToken() throws Exception {
        ContainerRequestContext requestContext = mockContext("/cursos", "GET", null);

        filter.filter(requestContext);

        verify(requestContext, never()).abortWith(any());
    }

    /** {@code /cursos} é público só para leitura: o cadastro de curso (KAN-44) exige token. */
    @Test
    void rejeitaEscritaEmCursosSemToken() throws Exception {
        ContainerRequestContext post = mockContext("/cursos", "POST", null);
        ContainerRequestContext subRota = mockContext("/cursos/1", "GET", null);

        filter.filter(post);
        filter.filter(subRota);

        verify(post).abortWith(any());
        verify(subRota).abortWith(any());
    }

    @Test
    void permitePreflightCorsSemToken() throws Exception {
        ContainerRequestContext requestContext = mockContext("/qualquer/rota/protegida", "OPTIONS", null);

        filter.filter(requestContext);

        verify(requestContext, never()).abortWith(any());
    }

    @Test
    void rejeitaRotaProtegidaSemHeaderAuthorization() throws Exception {
        ContainerRequestContext requestContext = mockContext("/comunidades/1", "GET", null);

        filter.filter(requestContext);

        assertAbortedWith401(requestContext);
    }

    @Test
    void rejeitaRotaProtegidaComHeaderSemPrefixoBearer() throws Exception {
        ContainerRequestContext requestContext = mockContext("/comunidades/1", "GET", "Token abc123");

        filter.filter(requestContext);

        assertAbortedWith401(requestContext);
    }

    @Test
    void rejeitaTokenInvalido() throws Exception {
        ContainerRequestContext requestContext = mockContext("/comunidades/1", "GET", "Bearer token-invalido");

        filter.filter(requestContext);

        assertAbortedWith401(requestContext);
    }

    /** Fecha o gap de cobertura citado na spec 1.5: token expirado deve ser 401, não passar. */
    @Test
    void rejeitaTokenExpirado() throws Exception {
        String tokenExpirado = Jwt.claims()
                .issuer(ISSUER)
                .subject("42")
                .claim("roles", Set.of("ALUNO"))
                .expiresAt(Instant.now().minusSeconds(3600))
                .sign(privateKey);
        ContainerRequestContext requestContext = mockContext("/comunidades/1", "GET", "Bearer " + tokenExpirado);

        filter.filter(requestContext);

        assertAbortedWith401(requestContext);
    }

    @Test
    void rejeitaTokenValidoSemClaimRoles() throws Exception {
        String tokenSemRoles = Jwt.claims()
                .issuer(ISSUER)
                .subject("42")
                .sign(privateKey);
        ContainerRequestContext requestContext = mockContext("/comunidades/1", "GET", "Bearer " + tokenSemRoles);

        filter.filter(requestContext);

        assertAbortedWith401(requestContext);
    }

    @Test
    void aceitaTokenValidoComSubERoles() throws Exception {
        String token = validToken("42", Set.of("ALUNO"));
        ContainerRequestContext requestContext = mockContext("/comunidades/1", "GET", "Bearer " + token);

        filter.filter(requestContext);

        verify(requestContext, never()).abortWith(any());
        verify(requestContext).setProperty(JwtSecurityFilter.REQUEST_PROPERTY_USUARIO_ID, "42");
        verify(requestContext).setProperty(JwtSecurityFilter.REQUEST_PROPERTY_ROLES, Set.of("ALUNO"));
        verify(requestContext).setProperty(org.mockito.ArgumentMatchers.eq(JwtSecurityFilter.REQUEST_PROPERTY_EMITIDO_EM), any());
    }

    @SuppressWarnings("unchecked")
    private void assertAbortedWith401(ContainerRequestContext requestContext) {
        ArgumentCaptor<Response> captor = ArgumentCaptor.forClass(Response.class);
        verify(requestContext).abortWith(captor.capture());
        assertEquals(Response.Status.UNAUTHORIZED.getStatusCode(), captor.getValue().getStatus());
        assertFalse(captor.getValue().getEntity() == null);
    }
}
