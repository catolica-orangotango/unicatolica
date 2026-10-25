package br.edu.unicatolica.pacext.comunidades.web;

/**
 * Corpo de {@code POST /comunidades} (Story 2.2). Sem campo {@code tipo} de propósito —
 * toda comunidade criada por aqui é ABERTA (RF21.2); a de tipo CURSO só nasce com o cadastro do
 * curso pelo administrador ({@code POST /cursos}, Story 2.1/KAN-44) ou pelo seed inicial.
 */
public record ComunidadeRequest(String nome, String descricao) {
}
