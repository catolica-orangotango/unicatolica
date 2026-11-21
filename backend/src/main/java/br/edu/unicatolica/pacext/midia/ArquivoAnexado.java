package br.edu.unicatolica.pacext.midia;

/** Arquivo pronto para exibir: {@code url} é assinada e expira (10 minutos por padrão). */
public record ArquivoAnexado(Long id, String nome, String tipo, long tamanho, String url) {
}
