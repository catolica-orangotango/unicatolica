package br.edu.unicatolica.pacext.moderacao.web;

import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import java.time.Instant;

/** Schema {@code DenunciaRegistrada} do contrato — confirmação para o denunciante. */
public record DenunciaRegistradaResponse(Long id, Instant criadoEm) {

    static DenunciaRegistradaResponse de(Denuncia denuncia) {
        return new DenunciaRegistradaResponse(denuncia.id, denuncia.criadoEm);
    }
}
