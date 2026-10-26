package br.edu.unicatolica.pacext.identidade.web;

import jakarta.validation.constraints.NotBlank;

/** Corpo de {@code POST /cursos} (KAN-44). O limite de tamanho é conferido no {@code CursoService}. */
public record CursoRequest(@NotBlank(message = "nome é obrigatório") String nome) {
}
