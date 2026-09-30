package br.edu.unicatolica.pacext.perfil.web;

import java.util.List;

/** Corpo de {@code PUT /perfil/me} — schema {@code PerfilRequest} do contrato. */
public record PerfilRequest(String nome, Long cursoId, Integer periodo, List<String> interesses) {
}
