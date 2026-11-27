package br.edu.unicatolica.pacext.avisos.web;

import java.time.LocalDate;

/** Corpo de {@code POST /admin/avisos}; as regras são validadas em {@code AvisoService}. */
public record AvisoRequest(String titulo, String mensagem, String escopo, Long cursoId, LocalDate dataDestaque) {
}
