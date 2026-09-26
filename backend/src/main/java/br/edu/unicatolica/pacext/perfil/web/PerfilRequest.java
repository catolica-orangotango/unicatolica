package br.edu.unicatolica.pacext.perfil.web;

import java.util.List;

/** Corpo de {@code PUT /perfil/me} (Story 4.1). */
public record PerfilRequest(String nome, String curso, Integer periodo, List<String> interesses) {
}
