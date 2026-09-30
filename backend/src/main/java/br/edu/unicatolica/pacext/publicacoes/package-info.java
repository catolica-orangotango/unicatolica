/**
 * Módulo de Publicações (RF32–RF36).
 *
 * <p>Dono da tabela {@code publicacao} (AD-3 — limites de módulo dentro do monólito):
 * nenhum outro módulo escreve nela diretamente. Comunidade e autor são guardados só pelo
 * id ({@code comunidade_id}, {@code autor_usuario_id}), sem FK nem relação JPA; nome do
 * autor vem de {@code identidade.UsuarioConsulta}. Organizado como {@code identidade}:
 * {@code web}, {@code aplicacao}, {@code dominio}. Por enquanto só o {@code dominio}
 * (entidade e repository); criar postagem (Story 3.1) e listar o feed (Story 3.2) ainda
 * não têm endpoint — dependem do contrato no {@code openapi.yaml} (AD-4). Ainda não
 * publica interface na raiz.</p>
 */
package br.edu.unicatolica.pacext.publicacoes;
