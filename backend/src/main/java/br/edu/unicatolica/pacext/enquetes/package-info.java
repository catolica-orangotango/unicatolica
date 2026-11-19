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
 * de {@code comunidades.ComunidadeConsulta}. Story 8.3: votar em enquete
 * ({@code POST /enquetes/{id}/votos}), só membro da comunidade de origem (RF55.1), uma vez por
 * usuário (RF56.1). O voto é anônimo (RF57.1): {@code enquete_participacao} guarda quem votou e
 * {@code enquete_voto} guarda só a opção escolhida, sem ligação entre as duas; nunca adicionar a
 * {@code enquete_voto} coluna de identidade, de data/hora ou de agrupamento por voto
 * ({@code EnqueteAnonimatoTest} protege isso). Só enquete {@code ATIVA} aceita voto (RF55.3).
 * Fixação (8.2), voto de não membro em enquete fixada (8.4), resultado (8.5) e encerramento (8.6)
 * ainda não existem.</p>
 */
package br.edu.unicatolica.pacext.enquetes;
