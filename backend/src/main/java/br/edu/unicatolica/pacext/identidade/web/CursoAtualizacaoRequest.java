package br.edu.unicatolica.pacext.identidade.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Corpo de {@code PUT /cursos/{id}} (KAN-44): renomear e ativar/desativar, os dois obrigatórios. */
public record CursoAtualizacaoRequest(
        @NotBlank(message = "nome é obrigatório") String nome,
        @NotNull(message = "ativo é obrigatório") Boolean ativo) {
}
