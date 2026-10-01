package br.edu.unicatolica.pacext.moderacao.web;

import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.moderacao.aplicacao.DenunciaEmAnalise;
import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import java.time.Instant;

/**
 * Schema {@code Denuncia} do contrato. Não tem, de propósito, nenhum campo com a identidade
 * do denunciante (RF77.1) — {@code denuncianteUsuarioId} nunca sai daqui.
 */
public record DenunciaResponse(Long id, ConteudoDenunciadoResponse conteudo, String motivo, String situacao,
        Instant criadoEm, Instant resolvidaEm) {

    static DenunciaResponse de(DenunciaEmAnalise analise, UsuarioResumo autor) {
        Denuncia d = analise.denuncia();
        return new DenunciaResponse(d.id, ConteudoDenunciadoResponse.de(d, analise.conteudo(), autor), d.motivo,
                d.situacao.name(), d.criadoEm, d.resolvidaEm);
    }
}
