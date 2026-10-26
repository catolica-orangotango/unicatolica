package br.edu.unicatolica.pacext.identidade.web;

import jakarta.validation.constraints.NotNull;

/** Corpo de {@code PUT /admin/usuarios/{id}/ativo}; {@code ativo} é obrigatório para não desativar por omissão. */
public record AlterarSituacaoRequest(@NotNull Boolean ativo) {
}
