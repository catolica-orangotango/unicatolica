package br.edu.unicatolica.pacext.identidade;

/**
 * Evento CDI disparado por Identidade quando o curso de um usuário muda (Story 4.1). Parte
 * da API pública: Comunidades reage com {@code @Observes} para refazer o auto-join
 * (RF24.1), sem que Identidade conheça quem escuta (Identidade é módulo folha).
 *
 * <p>Observer síncrono roda na mesma transação: uma exceção nele desfaz a alteração.</p>
 *
 * @param usuarioId       id do usuário
 * @param cursoAnteriorId id do curso anterior, ou {@code null} se o usuário não tinha curso
 * @param cursoNovoId     id do novo curso
 */
public record CursoDoUsuarioAlterado(Long usuarioId, Long cursoAnteriorId, Long cursoNovoId) {
}
