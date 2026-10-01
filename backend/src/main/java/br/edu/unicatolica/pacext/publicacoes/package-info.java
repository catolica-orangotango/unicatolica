/**
 * Módulo de Publicações (RF32–RF36).
 *
 * <p>Dono da tabela {@code publicacao} (AD-3 — limites de módulo dentro do monólito):
 * nenhum outro módulo escreve nela diretamente. Comunidade e autor são guardados só pelo
 * id ({@code comunidade_id}, {@code autor_usuario_id}), sem FK nem relação JPA; nome do
 * autor vem de {@code identidade.UsuarioConsulta}. Organizado como {@code identidade}:
 * {@code web}, {@code aplicacao}, {@code dominio}. Implementa criar postagem (Story 3.1,
 * {@code POST /comunidades/{id}/publicacoes}) e o feed da comunidade (Story 3.2,
 * {@code GET /comunidades/{id}/publicacoes}); existência da comunidade e "só membro publica"
 * (RF27.1) vêm de {@code comunidades.ComunidadeConsulta}. Publica {@link PublicacaoModeracao}:
 * a Moderação lê a postagem denunciada e a oculta/restaura (Story 12.5, RF78/RF78.1) pela
 * coluna {@code situacao}; postagem oculta sai do feed.</p>
 */
package br.edu.unicatolica.pacext.publicacoes;
