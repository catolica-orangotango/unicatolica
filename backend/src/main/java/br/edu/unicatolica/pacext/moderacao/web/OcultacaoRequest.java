package br.edu.unicatolica.pacext.moderacao.web;

/** Corpo de {@code POST /moderacao/denuncias/{id}/ocultacao} — schema {@code OcultacaoRequest}. */
public record OcultacaoRequest(String motivo) {
}
