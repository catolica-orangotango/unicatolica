package br.edu.unicatolica.pacext.midia.web;

import br.edu.unicatolica.pacext.midia.dominio.Arquivo;

/** Schema {@code Arquivo} do {@code openapi.yaml}: o arquivo recém-enviado, ainda sem URL. */
public record ArquivoResponse(Long id, String nome, String tipo, long tamanho) {

    public static ArquivoResponse de(Arquivo arquivo) {
        return new ArquivoResponse(arquivo.id, arquivo.nomeOriginal, arquivo.tipoConteudo, arquivo.tamanhoBytes);
    }
}
