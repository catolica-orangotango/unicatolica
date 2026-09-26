package br.edu.unicatolica.pacext.comunidades;

/**
 * Interface pública do módulo Comunidades (AD-3) para o auto-join de curso (RF24.1,
 * Story 2.3). É o único ponto por onde outro módulo (Identidade, e futuramente Perfil
 * Acadêmico/Epic 4) pode disparar uma escrita em {@code comunidade_membro} — nenhum
 * módulo externo injeta {@code dominio.ComunidadeMembroRepository} diretamente.
 */
public interface AutoJoinCursoService {

    /**
     * Sincroniza a associação do usuário à comunidade de curso correspondente ao texto de
     * curso informado. Idempotente por definição (RF24.1) — não passa pela checagem de
     * ingresso duplicado de RF25.
     *
     * @param usuarioId     id do aluno
     * @param cursoAnterior nome do curso anterior, ou {@code null} se for a primeira definição
     *                      (cadastro, Story 1.2)
     * @param cursoNovo     nome do curso recém-definido/alterado
     */
    void sincronizarCursoDoAluno(Long usuarioId, String cursoAnterior, String cursoNovo);
}
