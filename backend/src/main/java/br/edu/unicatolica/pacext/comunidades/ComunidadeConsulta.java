package br.edu.unicatolica.pacext.comunidades;

/**
 * Leitura de comunidades por outros módulos (API pública de Comunidades, AD-3). Os outros
 * módulos guardam só o {@code comunidade_id}, sem FK nem relação JPA, e checam existência e
 * associação por aqui — nunca injetando {@code dominio.ComunidadeRepository}.
 */
public interface ComunidadeConsulta {

    boolean existe(Long comunidadeId);

    /** Se o usuário é membro da comunidade (RF27.1) — base de "só membro publica" (Story 3.1). */
    boolean ehMembro(Long comunidadeId, Long usuarioId);
}
