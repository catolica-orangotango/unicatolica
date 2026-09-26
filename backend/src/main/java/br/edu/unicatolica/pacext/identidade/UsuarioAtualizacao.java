package br.edu.unicatolica.pacext.identidade;

/**
 * Escrita de nome e curso do usuário por outro módulo (API pública de Identidade,
 * AD-3) — hoje só o módulo Perfil Acadêmico (Epic 4, RF15/RF16) usa isto. Nenhum
 * módulo externo escreve na tabela {@code usuario} de outra forma; Identidade
 * continua módulo folha (não passa a depender de quem chama).
 */
public interface UsuarioAtualizacao {

    /**
     * @param usuarioId id do usuário autenticado
     * @param nome      novo nome, já validado como não-vazio pelo chamador (RF15)
     * @param curso     novo curso, ou {@code null} para "sem curso"; quem chama decide se
     *                  isso precisa ressincronizar o auto-join de comunidade de curso
     *                  (RF16) via {@code comunidades.AutoJoinCursoService} — esta
     *                  interface só grava o dado, não dispara nada em Comunidades
     */
    void atualizarNomeECurso(Long usuarioId, String nome, String curso);
}
