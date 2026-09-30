/**
 * Módulo de Perfil Acadêmico (RF14–RF20).
 *
 * <p>Dono das tabelas {@code perfil_academico} e {@code perfil_interesse} (AD-3 — limites
 * de módulo dentro do monólito): nenhum outro módulo escreve nelas diretamente. Guarda só
 * período e interesses; nome e curso são de {@code usuario}, no módulo Identidade, e são
 * lidos e gravados por {@code identidade.UsuarioCadastro}. O usuário é referenciado só pelo id
 * ({@code usuario_id}), sem FK nem relação JPA. Organizado como {@code identidade}:
 * {@code web}, {@code aplicacao}, {@code dominio}. Implementa {@code GET}/{@code PUT
 * /perfil/me} (Stories 4.2 e 4.1) e {@code GET /usuarios/{id}/perfil} (Story 4.4). Nome e
 * curso são gravados por {@code identidade.UsuarioCadastro}; a troca de curso refaz o
 * auto-join pelo evento {@code identidade.CursoDoUsuarioAlterado}. Ainda não publica
 * interface na raiz.</p>
 */
package br.edu.unicatolica.pacext.perfil;
