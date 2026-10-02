package br.edu.unicatolica.pacext.identidade;

/**
 * Evento CDI disparado por Identidade a cada login de um {@code ALUNO} (Story 4.3,
 * RF20.1). Parte da API pública: outro módulo reage com {@code @Observes LoginRealizado}
 * sem que Identidade conheça quem escuta (Identidade é módulo folha) — mesmo padrão de
 * {@link UsuarioCadastrado}.
 *
 * <p>Só dispara para perfil {@code ALUNO} — login de {@code MODERADOR}/{@code
 * ADMINISTRADOR} não tem "perfil acadêmico" para completar.</p>
 *
 * @param usuarioId   id do usuário que logou
 * @param totalLogins quantos logins este usuário já fez, contando este
 */
public record LoginRealizado(Long usuarioId, int totalLogins) {
}
