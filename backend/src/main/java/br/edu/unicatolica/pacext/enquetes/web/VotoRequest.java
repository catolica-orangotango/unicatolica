package br.edu.unicatolica.pacext.enquetes.web;

import java.util.List;

/** Corpo de {@code POST /enquetes/{id}/votos} — schema {@code VotoRequest} do contrato. */
public record VotoRequest(List<Long> opcaoIds) {
}
