package br.edu.unicatolica.pacext.identidade;

/**
 * Evento CDI disparado por Identidade quando um aluno termina o cadastro (Story 1.2).
 * Parte da API pública: outro módulo reage com {@code @Observes UsuarioCadastrado} sem que
 * Identidade conheça quem escuta (Identidade é módulo folha).
 *
 * <p>Observers síncronos rodam na mesma transação do cadastro: uma exceção num observer
 * desfaz o cadastro inteiro.</p>
 *
 * @param usuarioId id do usuário recém-criado
 * @param cursoId   id do curso escolhido no cadastro
 */
public record UsuarioCadastrado(Long usuarioId, Long cursoId) {
}
