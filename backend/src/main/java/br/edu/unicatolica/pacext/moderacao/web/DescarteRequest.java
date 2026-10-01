package br.edu.unicatolica.pacext.moderacao.web;

/** Corpo opcional de {@code POST /moderacao/denuncias/{id}/descarte} — schema {@code DescarteRequest}. */
public record DescarteRequest(String motivo) {
}
