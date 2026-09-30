package br.edu.unicatolica.pacext.compartilhado.seguranca;

import br.edu.unicatolica.pacext.compartilhado.erro.RespostasErro;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.auth.principal.ParseException;
import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.HttpMethod;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.PreMatching;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.ext.Provider;
import java.io.IOException;
import java.time.Instant;
import java.util.Set;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

/**
 * Filtro de segurança JWT global (AD-2 da Architecture Spine).
 *
 * <p>É o único ponto do backend que valida autenticação — intercepta toda requisição
 * antes dela alcançar qualquer módulo de domínio, exceto os caminhos da allowlist
 * {@code @PermitAll} abaixo, que vive só aqui, nunca espalhada por módulo. Transporte
 * exclusivamente via header {@code Authorization: Bearer} — nunca cookie. Claims fixos
 * exigidos no token: {@code sub} (id do usuário) e {@code roles} (perfis globais, RF13);
 * nenhum módulo inventa nome de claim próprio.</p>
 *
 * <p>Autorização fina por perfil (RF13) é responsabilidade de cada módulo consumidor,
 * não deste filtro — aqui só se garante que o token existe, é válido e carrega as duas
 * claims obrigatórias, disponibilizando-as via propriedades da requisição para uso
 * downstream ({@link #REQUEST_PROPERTY_USUARIO_ID} e {@link #REQUEST_PROPERTY_ROLES}).</p>
 *
 * <p>A checagem de sessão invalidada por logout (Story 1.6, RF10/RF11) NÃO mora aqui —
 * vive em {@link SessaoInvalidadaFilter}, um filtro comum (não {@code @PreMatching}). Um
 * filtro {@code @PreMatching} roda sempre na thread de I/O do Vert.x, e essa checagem
 * consulta o banco (bloqueante); mover para um filtro pós-roteamento com {@code @Blocking}
 * foi a correção do defeito D1 (que derrubava toda rota autenticada com 401).</p>
 */
@Provider
@PreMatching
@Priority(Priorities.AUTHENTICATION)
public class JwtSecurityFilter implements ContainerRequestFilter {

    private static final Logger LOG = Logger.getLogger(JwtSecurityFilter.class);

    /** Allowlist única de endpoints públicos — não pertence a nenhum módulo (AD-2). */
    private static final Set<String> ALLOWLIST = Set.of(
            "/auth/login",
            "/auth/registro",
            "/auth/confirmacao-email",
            "/q/health",
            "/q/health/live",
            "/q/health/ready");

    /**
     * Públicos só para leitura ({@code GET}, match exato): {@code /cursos} alimenta o
     * select do cadastro, antes do login. O {@code POST /cursos} do administrador (KAN-44)
     * continua exigindo token.
     */
    private static final Set<String> ALLOWLIST_SOMENTE_GET = Set.of("/cursos");

    public static final String REQUEST_PROPERTY_USUARIO_ID = "pacext.usuarioId";
    public static final String REQUEST_PROPERTY_ROLES = "pacext.roles";
    /** Consumida por {@link SessaoInvalidadaFilter} para checar invalidação por logout. */
    public static final String REQUEST_PROPERTY_EMITIDO_EM = "pacext.emitidoEm";

    private static final String BEARER_PREFIX = "Bearer ";

    @Inject
    JWTParser jwtParser;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        // Preflight de CORS nunca carrega Authorization — deixa passar para o handler de CORS central (AD-2/AD-6).
        if (HttpMethod.OPTIONS.equals(requestContext.getMethod())) {
            return;
        }

        String rawPath = requestContext.getUriInfo().getPath();
        String path = rawPath == null ? "/" : (rawPath.startsWith("/") ? rawPath : "/" + rawPath);
        if (isAllowlisted(path) || (HttpMethod.GET.equals(requestContext.getMethod())
                && ALLOWLIST_SOMENTE_GET.contains(path))) {
            return;
        }

        String authorizationHeader = requestContext.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            abort(requestContext, "Requisição sem header Authorization: Bearer <token>.");
            return;
        }

        String token = authorizationHeader.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            abort(requestContext, "Token JWT ausente após o prefixo Bearer.");
            return;
        }

        try {
            JsonWebToken jwt = jwtParser.parse(token);
            String usuarioId = jwt.getSubject();
            Set<String> roles = jwt.getGroups();

            if (usuarioId == null || usuarioId.isBlank()) {
                abort(requestContext, "Token não contém a claim obrigatória 'sub'.");
                return;
            }
            if (roles == null || roles.isEmpty()) {
                abort(requestContext, "Token não contém a claim obrigatória 'roles'.");
                return;
            }

            requestContext.setProperty(REQUEST_PROPERTY_USUARIO_ID, usuarioId);
            requestContext.setProperty(REQUEST_PROPERTY_ROLES, roles);
            requestContext.setProperty(REQUEST_PROPERTY_EMITIDO_EM, Instant.ofEpochSecond(jwt.getIssuedAtTime()));
        } catch (ParseException | RuntimeException e) {
            // WARN, não ERROR: este catch também cobre token genuinamente inválido/expirado
            // (tráfego normal), não só falha de infraestrutura — mas precisa logar, senão
            // uma falha real (ex.: consulta bloqueante rejeitada na thread de I/O) fica
            // disfarçada de "token inválido" sem nenhum rastro (defeito D1).
            LOG.warn("Falha ao validar token JWT.", e);
            abort(requestContext, "Token JWT inválido ou expirado.");
        }
    }

    /**
     * Match exato de segmento de path — {@code startsWith} puro deixaria rotas futuras
     * como {@code /auth/login-tentativas} ou {@code /q/healthz} escaparem indevidamente
     * da autenticação por coincidirem com o prefixo de uma entrada da allowlist.
     */
    private boolean isAllowlisted(String path) {
        return ALLOWLIST.stream().anyMatch(allowed -> path.equals(allowed) || path.startsWith(allowed + "/"));
    }

    private void abort(ContainerRequestContext requestContext, String detalhes) {
        requestContext.abortWith(RespostasErro.naoAutenticado(detalhes));
    }
}
