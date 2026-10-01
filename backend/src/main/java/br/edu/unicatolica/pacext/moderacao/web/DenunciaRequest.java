package br.edu.unicatolica.pacext.moderacao.web;

/**
 * Corpo de {@code POST /denuncias} — schema {@code DenunciaRequest} do contrato.
 * {@code tipoConteudo} chega como texto para o valor inválido virar 422, não erro de parse.
 */
public record DenunciaRequest(String tipoConteudo, Long conteudoId, String motivo) {
}
