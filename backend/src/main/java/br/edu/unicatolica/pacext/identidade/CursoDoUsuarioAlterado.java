package br.edu.unicatolica.pacext.identidade;

/**
 * Evento CDI disparado por Identidade quando o curso de um usuário muda (Story 4.1). Parte
 * da API pública: Comunidades reage com {@code @Observes} para refazer o auto-join
 * (RF24.1), sem que Identidade conheça quem escuta (Identidade é módulo folha).
 *
 * <p>Observer síncrono roda na mesma transação: uma exceção nele desfaz a alteração.</p>
 *
 * @param usuarioId     id do usuário
 * @param cursoAnterior nome do curso anterior, ou {@code null} se o usuário não tinha curso
 * @param cursoNovo     nome do novo curso
 */
public record CursoDoUsuarioAlterado(Long usuarioId, String cursoAnterior, String cursoNovo) {
}
