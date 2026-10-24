package br.edu.unicatolica.pacext.comunidades;

/**
 * Interface pública do módulo Comunidades (AD-3) para o auto-join de curso (RF24.1,
 * Story 2.3). É o único ponto por onde outro módulo (Identidade, e futuramente Perfil
 * Acadêmico/Epic 4) pode disparar uma escrita em {@code comunidade_membro} — nenhum
 * módulo externo injeta {@code dominio.ComunidadeMembroRepository} diretamente.
 */
public interface AutoJoinCursoService {

    /**
     * Sincroniza a associação do usuário à comunidade do curso informado. A comunidade de
     * curso é encontrada pelo id do curso (KAN-44), então renomear o curso não quebra o
     * vínculo. Idempotente por definição (RF24.1) — não passa pela checagem de ingresso
     * duplicado de RF25.
     *
     * @param usuarioId       id do aluno
     * @param cursoAnteriorId id do curso anterior, ou {@code null} se for a primeira definição
     *                        (cadastro, Story 1.2)
     * @param cursoNovoId     id do curso recém-definido/alterado
     */
    void sincronizarCursoDoAluno(Long usuarioId, Long cursoAnteriorId, Long cursoNovoId);
}
