package br.edu.unicatolica.pacext.compartilhado.seguranca;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import io.smallrye.jwt.auth.principal.DefaultJWTParser;
import io.smallrye.jwt.auth.principal.JWTAuthContextInfo;
import io.smallrye.jwt.auth.principal.JWTParser;
import io.smallrye.jwt.build.Jwt;
import io.smallrye.jwt.util.KeyUtils;
import java.security.KeyPair;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.List;
import java.util.Set;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Fecha o gap apontado no code review da spec 1.5: {@link UsuarioAutenticado} lê a
 * identidade via o {@link JsonWebToken} injetado por CDI (populado pelo mecanismo de
 * autenticação do SmallRye JWT a partir de {@code smallrye.jwt.path.groups=roles}), um
 * caminho de leitura de claims completamente separado do {@code JWTParser.parse(...)} +
 * {@code getGroups()}/{@code getSubject()} manual usado por {@code JwtSecurityFilter}
 * (coberto por {@code JwtSecurityFilterTest}). Nenhum teste provava que os dois caminhos
 * concordam — este teste monta o mesmo {@link JWTAuthContextInfo} com
 * {@code groupsPath("roles")} usado pelo runtime real (ver
 * {@code ApplicationPropertiesJwtConfigTest}), assina um token de verdade com
 * {@code Jwt.claims()...sign(privateKey)} (mesmo padrão de {@code JwtSecurityFilterTest}) e
 * verifica-o com o {@link DefaultJWTParser} real — o mesmo parser que a extensão SmallRye JWT
 * usa para popular o {@link JsonWebToken} injetado em {@link UsuarioAutenticado} em produção —
 * provando que {@code sub}/{@code roles} realmente chegam a {@link UsuarioAutenticado#id()} e
 * {@link UsuarioAutenticado#possuiPerfil(String)} como o filtro assume. Sem Docker disponível
 * neste ambiente para os Dev Services de Postgres, este teste fica no mesmo nível
 * "sem runtime" dos demais testes de JWT — sem {@code @QuarkusTest} nem round-trip HTTP.
 * Par de chaves gerado em memória a cada execução, nenhuma chave commitada no repo.
 */
class UsuarioAutenticadoTest {

    private static final String ISSUER = "https://pacext.unicatolica.edu.br";

    private static PrivateKey privateKey;
    private static JWTParser jwtParser;

    @BeforeAll
    static void setUpParser() throws Exception {
        KeyPair par = KeyUtils.generateKeyPair(2048);
        privateKey = par.getPrivate();
        PublicKey publicKey = par.getPublic();

        JWTAuthContextInfo contextInfo = new JWTAuthContextInfo(publicKey, ISSUER);
        contextInfo.setGroupsPath("roles");

        jwtParser = new DefaultJWTParser(contextInfo);
    }

    private UsuarioAutenticado usuarioAutenticadoPara(String subject, Set<String> roles) throws Exception {
        String token = Jwt.claims()
                .issuer(ISSUER)
                .subject(subject)
                .claim("roles", roles)
                .sign(privateKey);
        JsonWebToken jsonWebToken = jwtParser.parse(token);

        UsuarioAutenticado usuarioAutenticado = new UsuarioAutenticado();
        usuarioAutenticado.jsonWebToken = jsonWebToken;
        return usuarioAutenticado;
    }

    @Test
    void idLeSubDeUmTokenRealVerificadoPeloParserDoSmallRye() throws Exception {
        UsuarioAutenticado usuarioAutenticado = usuarioAutenticadoPara("42", Set.of("ALUNO"));

        assertEquals(42L, usuarioAutenticado.id());
    }

    @Test
    void possuiPerfilLeRolesMapeadaPorGroupsPathComoOFiltroAssume() throws Exception {
        UsuarioAutenticado usuarioAutenticado = usuarioAutenticadoPara("42", Set.of("MODERADOR"));

        assertTrue(usuarioAutenticado.possuiPerfil("MODERADOR"));
        assertFalse(usuarioAutenticado.possuiPerfil("ALUNO"));
    }

    @Test
    void idLancaNaoAutenticadoQuandoSubNaoENumerico() throws Exception {
        UsuarioAutenticado usuarioAutenticado = usuarioAutenticadoPara("nao-numerico", Set.of("ALUNO"));

        ApiException erro = assertThrows(ApiException.class, usuarioAutenticado::id);
        assertEquals(401, erro.getStatus());
        assertEquals("NAO_AUTENTICADO", erro.getCode());
    }

    @Test
    void podeModerarAceitaModeradorEAdministradorMasNaoAluno() throws Exception {
        assertTrue(usuarioAutenticadoPara("1", Set.of(Perfis.MODERADOR)).podeModerar());
        assertTrue(usuarioAutenticadoPara("1", Set.of(Perfis.ADMINISTRADOR)).podeModerar());
        assertFalse(usuarioAutenticadoPara("1", Set.of(Perfis.ALUNO)).podeModerar());
        assertFalse(usuarioAutenticadoPara("1", Set.of()).podeModerar());
    }

    @Test
    void exigirModeradorLiberaModeradorEAdministrador() throws Exception {
        usuarioAutenticadoPara("1", Set.of(Perfis.MODERADOR)).exigirModerador();
        usuarioAutenticadoPara("1", Set.of(Perfis.ADMINISTRADOR)).exigirModerador();
    }

    @Test
    void exigirModeradorLanca403ParaAlunoESemPerfil() throws Exception {
        for (Set<String> roles : List.of(Set.of(Perfis.ALUNO), Set.<String>of())) {
            UsuarioAutenticado usuario = usuarioAutenticadoPara("1", roles);
            ApiException erro = assertThrows(ApiException.class, usuario::exigirModerador);
            assertEquals(403, erro.getStatus());
            assertEquals("ACESSO_NEGADO", erro.getCode());
        }
    }

    @Test
    void exigirAdministradorLiberaSoAdministrador() throws Exception {
        usuarioAutenticadoPara("1", Set.of(Perfis.ADMINISTRADOR)).exigirAdministrador();
        for (Set<String> roles : List.of(Set.of(Perfis.ALUNO), Set.of(Perfis.MODERADOR), Set.<String>of())) {
            UsuarioAutenticado usuario = usuarioAutenticadoPara("1", roles);
            ApiException erro = assertThrows(ApiException.class, usuario::exigirAdministrador);
            assertEquals(403, erro.getStatus());
            assertEquals("ACESSO_NEGADO", erro.getCode());
        }
    }
}
