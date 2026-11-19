/**
 * Módulo de Enquetes (Epic 8, RF53–RF58).
 *
 * <p>Dono das tabelas {@code enquete} e {@code enquete_opcao} (AD-3 — limites de módulo
 * dentro do monólito): nenhum outro módulo escreve nelas diretamente. Comunidade e autor
 * são guardados só pelo id ({@code comunidade_id}, {@code autor_usuario_id}), sem FK nem
 * relação JPA; nome do autor vem de {@code identidade.UsuarioConsulta}. Organizado como
 * {@code publicacoes}: {@code web}, {@code aplicacao}, {@code dominio}. Implementa criar
 * enquete (Story 8.1, {@code POST /comunidades/{id}/enquetes}), listar as enquetes da
 * comunidade ({@code GET /comunidades/{id}/enquetes}) e as ativas do usuário
 * ({@code GET /enquetes/minhas}); existência da comunidade e "só membro cria" (RF53.1) vêm
 * de {@code comunidades.ComunidadeConsulta}. Fixação (8.2), voto (8.3 e 8.4), resultado
 * (8.5) e encerramento (8.6) ainda não existem. Nunca adicionar coluna de identidade ou
 * timestamp à tabela de voto (RF57.1) quando a Story 8.3 a criar.</p>
 */
package br.edu.unicatolica.pacext.enquetes;
