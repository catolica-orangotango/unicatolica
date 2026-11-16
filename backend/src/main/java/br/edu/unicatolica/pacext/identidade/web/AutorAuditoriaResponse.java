package br.edu.unicatolica.pacext.identidade.web;

/** Autor de um log; {@code nome} e {@code email} nulos = usuário que não existe mais (KAN-90, RN09). */
public record AutorAuditoriaResponse(Long id, String nome, String email) {
}
