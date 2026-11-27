package br.edu.unicatolica.pacext.identidade;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;

/**
 * Leitura de cursos por outros módulos (API pública de Identidade). Os outros módulos guardam só o
 * {@code curso_id}, sem FK nem relação JPA, e resolvem o nome por aqui (AD-3).
 */
public interface CursoConsulta {

    /** @return nome do curso (ativo ou não), ou vazio se o id não existe. */
    Optional<String> nome(Long cursoId);

    /** Consulta em lote, para uma listagem não gerar uma consulta por item (N+1). */
    Map<Long, String> nomes(Collection<Long> cursoIds);
}
