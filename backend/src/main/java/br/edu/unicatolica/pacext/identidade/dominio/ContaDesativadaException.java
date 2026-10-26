package br.edu.unicatolica.pacext.identidade.dominio;

import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import jakarta.ws.rs.core.Response;

/**
 * Lançada no login (KAN-83) quando a credencial está correta mas o administrador desativou a
 * conta. Como {@link EmailNaoConfirmadoException}, só vem depois de confirmar e-mail e senha,
 * para não revelar a situação de uma conta a quem não sabe a senha. Vira 401
 * {@code CONTA_DESATIVADA} pelo {@code ApiExceptionMapper}.
 */
public class ContaDesativadaException extends ApiException {

    public ContaDesativadaException() {
        super(Response.Status.UNAUTHORIZED.getStatusCode(), "CONTA_DESATIVADA",
                "Sua conta está desativada. Procure a administração da plataforma.", null);
    }
}
