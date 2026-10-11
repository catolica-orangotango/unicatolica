package br.edu.unicatolica.pacext.comunidades.web;

/** Corpo do {@code PATCH /comunidades/{id}} (Story 2.6) — campo {@code null} não é alterado. */
public record ComunidadeEdicaoRequest(String nome, String descricao) {
}
