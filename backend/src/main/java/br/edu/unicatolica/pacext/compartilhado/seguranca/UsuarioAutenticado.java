package br.edu.unicatolica.pacext.compartilhado.seguranca;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.jwt.JsonWebToken;

/**
 * Leitura da identidade autenticada da requisição corrente (Story 1.5, RF12/RF13).
 *
 * <p>Não substitui o {@code JwtSecurityFilter} (AD-2) — só expõe, via bean CDI
 * {@code @RequestScoped}, o que o SmallRye JWT já populou como {@link JsonWebToken}
 * independentemente das properties que o filtro grava no {@code ContainerRequestContext}.
 * Ponto de reuso: qualquer módulo que precise decidir autorização fina por perfil injeta
 * este bean em vez de ler {@code ContainerRequestContext}/nomes de property string.</p>
 */
@RequestScoped
public class UsuarioAutenticado {

    @Inject
    JsonWebToken jsonWebToken;

    /**
     * @return id (claim {@code sub}) do usuário autenticado na requisição corrente.
     * @throws ApiException 401 {@code NAO_AUTENTICADO} se a claim {@code sub} estiver ausente
     *     ou não for numérica — guarda defensiva contra drift entre o {@code JwtSecurityFilter} (que já
     *     validou o token) e o {@link JsonWebToken} injetado via CDI; nunca deveria ocorrer
     *     em uso normal.
     */
    public Long id() {
        try {
            return Long.valueOf(jsonWebToken.getSubject());
        } catch (NumberFormatException e) {
            throw ApiException.naoAutenticado("NAO_AUTENTICADO", "Autenticação necessária.", null);
        }
    }

    /**
     * @return {@code true} se a claim {@code roles} do token contém o perfil informado
     *     (correspondência exata; para a regra de moderação use {@link #podeModerar()}).
     */
    public boolean possuiPerfil(String perfil) {
        return jsonWebToken.getGroups() != null && jsonWebToken.getGroups().contains(perfil);
    }

    /** @return {@code true} para {@code MODERADOR} ou {@code ADMINISTRADOR}: o administrador tem as permissões de moderador. */
    public boolean podeModerar() {
        return possuiPerfil(Perfis.MODERADOR) || possuiPerfil(Perfis.ADMINISTRADOR);
    }

    /** @throws ApiException 403 {@code ACESSO_NEGADO} se o usuário não pode moderar. */
    public void exigirModerador() {
        if (!podeModerar()) {
            throw acessoNegado();
        }
    }

    /** @throws ApiException 403 {@code ACESSO_NEGADO} se o usuário não é {@code ADMINISTRADOR}. */
    public void exigirAdministrador() {
        if (!possuiPerfil(Perfis.ADMINISTRADOR)) {
            throw acessoNegado();
        }
    }

    private static ApiException acessoNegado() {
        return ApiException.semPermissao("ACESSO_NEGADO", "Você não tem permissão para executar esta ação.", null);
    }
}
