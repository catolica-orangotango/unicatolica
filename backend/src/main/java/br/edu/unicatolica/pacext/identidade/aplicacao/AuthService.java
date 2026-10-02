package br.edu.unicatolica.pacext.identidade.aplicacao;

import br.edu.unicatolica.pacext.identidade.LoginRealizado;
import br.edu.unicatolica.pacext.identidade.dominio.CredenciaisInvalidasException;
import br.edu.unicatolica.pacext.identidade.dominio.EmailNaoConfirmadoException;
import br.edu.unicatolica.pacext.identidade.dominio.PasswordHasher;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.security.PrivateKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Login e emissão de sessão JWT (Story 1.4, RF06/RF07/RF08). Único ponto do backend que
 * emite token — sempre com claims {@code sub} (id do usuário) e {@code roles} (perfil
 * global), conforme exigido pelo filtro de segurança global (AD-2).
 */
@ApplicationScoped
public class AuthService {

    @Inject
    UsuarioRepository usuarioRepository;

    @Inject
    PasswordHasher passwordHasher;

    @Inject
    AuditoriaService auditoriaService;

    @Inject
    PrivateKey privateKey;

    @Inject
    Event<LoginRealizado> loginRealizado;

    @ConfigProperty(name = "mp.jwt.verify.issuer")
    String issuer;

    /**
     * @throws CredenciaisInvalidasException se o e-mail não existe ou a senha não confere —
     *         mensagem genérica, nunca indica qual das duas, para não vazar quais e-mails
     *         existem na base (RF07).
     * @throws EmailNaoConfirmadoException se a credencial está correta mas o e-mail ainda
     *         não foi confirmado (Story 1.3, RF01.2) — mensagem distinta da anterior. A
     *         checagem de confirmação só acontece depois de validar a senha, de propósito:
     *         senha errada sempre cai em CredenciaisInvalidasException, mesmo para e-mail
     *         não confirmado — senão daria pra enumerar contas pendentes testando senhas.
     *
     *         <p>{@code @Transactional}: precisa de transação para persistir o incremento
     *         de {@code totalLogins} (Story 4.3) e para o observer de {@link LoginRealizado}
     *         rodar na mesma transação (mesmo padrão de {@code UsuarioCadastrado}).</p>
     */
    @Transactional
    public String autenticar(String email, String senha) {
        Usuario usuario = buscarUsuarioComCredencialValida(email, senha);

        if (!usuario.emailConfirmado) {
            throw new EmailNaoConfirmadoException();
        }

        // Claim literal "roles" (não o helper .groups(), que grava sob a claim padrão
        // "groups") — AD-2 promete "roles" por nome, e smallrye.jwt.path.groups=roles só
        // funcionava até aqui por coincidência: fallback silencioso do SmallRye para
        // "groups" quando o path configurado não resolve (defeito D3).
        String token = Jwt.claims()
                .issuer(issuer)
                .subject(String.valueOf(usuario.id))
                .claim("roles", Set.of(usuario.perfil))
                .sign(privateKey);

        auditoriaService.registrar(usuario.id, "identidade", "LOGIN", "Login bem-sucedido.");

        usuario.totalLogins++;
        // Só ALUNO tem "perfil acadêmico" a completar (Story 4.3) — login de
        // MODERADOR/ADMINISTRADOR não dispara o gatilho de onboarding.
        if ("ALUNO".equals(usuario.perfil)) {
            loginRealizado.fire(new LoginRealizado(usuario.id, usuario.totalLogins));
        }

        return token;
    }

    /**
     * Logout (Story 1.6, RF10/RF11): adianta a invalidação do token atual gravando o
     * instante presente em {@code sessaoValidaDesde} — o JWT ainda expira naturalmente
     * pelo claim {@code exp}, mas {@link br.edu.unicatolica.pacext.compartilhado.seguranca.JwtSecurityFilter}
     * passa a rejeitar qualquer token emitido antes deste instante para este usuário.
     *
     * <p>Truncado para segundos porque o claim {@code iat} do JWT (NumericDate) só tem essa
     * precisão — sem truncar, {@code sessaoValidaDesde} carregaria uma precisão sub-segundo
     * que nenhum {@code iat} jamais poderia igualar ou superar, tornando a comparação em
     * {@code SessaoInvalidadaFilter} inconsistente. Com os dois truncados ao mesmo grão, um
     * token cujo {@code iat} coincide com este instante foi necessariamente emitido antes do
     * logout (ou durante) e é corretamente invalidado — ver o comentário de
     * {@code SessaoInvalidadaFilter} sobre por que a comparação usa {@code <=}.</p>
     */
    @Transactional
    public void logout(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId);
        if (usuario == null) {
            return;
        }
        usuario.sessaoValidaDesde = Instant.now().truncatedTo(ChronoUnit.SECONDS);
        auditoriaService.registrar(usuario.id, "identidade", "LOGOUT", "Logout realizado.");
    }

    private Usuario buscarUsuarioComCredencialValida(String email, String senha) {
        Optional<Usuario> usuario = usuarioRepository.buscarPorEmail(email);
        if (usuario.isEmpty() || !passwordHasher.confere(senha, usuario.get().senhaHash)) {
            throw new CredenciaisInvalidasException();
        }
        return usuario.get();
    }
}
