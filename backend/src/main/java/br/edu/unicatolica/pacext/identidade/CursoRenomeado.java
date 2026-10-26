package br.edu.unicatolica.pacext.identidade;

/**
 * Evento CDI disparado por Identidade quando o administrador renomeia um curso (KAN-44).
 * Comunidades reage com {@code @Observes} e renomeia a comunidade de curso, que guarda só o
 * {@code cursoId} (AD-3). Observer síncrono, na mesma transação.
 *
 * @param cursoId id do curso
 * @param nome    novo nome, já sem espaços nas pontas
 */
public record CursoRenomeado(Long cursoId, String nome) {
}
