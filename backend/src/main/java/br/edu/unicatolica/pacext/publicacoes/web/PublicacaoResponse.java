package br.edu.unicatolica.pacext.publicacoes.web;

import br.edu.unicatolica.pacext.identidade.UsuarioResumo;
import br.edu.unicatolica.pacext.midia.ArquivoAnexado;
import br.edu.unicatolica.pacext.publicacoes.dominio.Publicacao;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/** Schema {@code PublicacaoResponse} do contrato; {@code anexo} fica ausente quando não há arquivo. */
public record PublicacaoResponse(Long id, Long comunidadeId, AutorResumo autor, String conteudo, Instant criadoEm,
        @JsonInclude(JsonInclude.Include.NON_NULL) Anexo anexo) {

    /** Schema {@code Anexo} do contrato — montado a partir de {@code midia.ArquivoAnexado} (AD-3). */
    public record Anexo(Long id, String nome, String tipo, long tamanho, String url) {

        static Anexo de(ArquivoAnexado arquivo) {
            if (arquivo == null) {
                return null;
            }
            return new Anexo(arquivo.id(), arquivo.nome(), arquivo.tipo(), arquivo.tamanho(), arquivo.url());
        }
    }

    static PublicacaoResponse de(Publicacao publicacao, UsuarioResumo autor, ArquivoAnexado arquivo) {
        return new PublicacaoResponse(publicacao.id, publicacao.comunidadeId,
                AutorResumo.de(publicacao.autorUsuarioId, autor), publicacao.conteudo, publicacao.criadoEm,
                Anexo.de(arquivo));
    }
}
