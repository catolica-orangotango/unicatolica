package br.edu.unicatolica.pacext.moderacao.web;

import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.moderacao.dominio.Denuncia;
import br.edu.unicatolica.pacext.publicacoes.PublicacaoModeravel;
import java.time.Instant;

/** Schema {@code ConteudoDenunciado} do contrato. */
public record ConteudoDenunciadoResponse(String tipo, Long id, String texto, AutorResumo autor, Long comunidadeId,
        Instant criadoEm, String situacao) {

    /** Postagem que não existe mais em Publicações — a denúncia continua aparecendo na fila. */
    static final String TEXTO_CONTEUDO_AUSENTE = "Conteúdo indisponível.";

    static ConteudoDenunciadoResponse de(Denuncia denuncia, PublicacaoModeravel publicacao, UsuarioResumo autor) {
        AutorResumo autorResumo = AutorResumo.de(denuncia.autorConteudoUsuarioId, autor);
        if (publicacao == null) {
            return new ConteudoDenunciadoResponse(denuncia.tipoConteudo.name(), denuncia.conteudoId,
                    TEXTO_CONTEUDO_AUSENTE, autorResumo, null, denuncia.criadoEm, "OCULTO");
        }
        return new ConteudoDenunciadoResponse(denuncia.tipoConteudo.name(), publicacao.id(), publicacao.conteudo(),
                autorResumo, publicacao.comunidadeId(), publicacao.criadoEm(), publicacao.oculta() ? "OCULTO" : "VISIVEL");
    }
}
