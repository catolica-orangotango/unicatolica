package br.edu.unicatolica.pacext.identidade;

/**
 * Evento CDI disparado por Identidade quando o administrador cadastra um curso (KAN-44).
 * Parte da API pública: Comunidades reage com {@code @Observes} e cria a comunidade de curso
 * (Story 2.1, RF21.2), sem que Identidade conheça quem escuta (Identidade é módulo folha).
 *
 * <p>Observer síncrono roda na mesma transação: uma exceção nele (por exemplo, nome já usado
 * por outra comunidade) desfaz o cadastro do curso.</p>
 *
 * @param cursoId            id do curso recém-criado
 * @param nome               nome do curso, já sem espaços nas pontas
 * @param criadoPorUsuarioId id do administrador que cadastrou
 */
public record CursoCadastrado(Long cursoId, String nome, Long criadoPorUsuarioId) {
}
