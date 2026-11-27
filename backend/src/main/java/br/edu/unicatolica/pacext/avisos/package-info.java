/**
 * Módulo de Avisos Institucionais (Epic 13, RF81/RF82).
 *
 * <p>Dono da tabela {@code aviso} (AD-3): nenhum outro módulo escreve nela. O curso do escopo e o
 * autor são guardados só pelo id ({@code curso_id}, {@code autor_usuario_id}), sem FK nem relação
 * JPA; o nome do curso vem de {@code identidade.CursoConsulta}. Organizado como {@code identidade}:
 * {@code web}, {@code aplicacao}, {@code dominio}. Implementa a publicação pelo administrador
 * (Story 13.1, {@code POST /admin/avisos}) e a lista dos enviados ({@code GET /admin/avisos});
 * a exibição no Início do aluno é a Story 13.2. Só {@code ADMINISTRADOR} publica (RF81).</p>
 */
package br.edu.unicatolica.pacext.avisos;
