/**
 * Módulo de Perfil Acadêmico (RF14–RF20).
 *
 * <p>Dono das tabelas {@code perfil_academico} e {@code perfil_interesse} (AD-3 — limites
 * de módulo dentro do monólito): nenhum outro módulo escreve nelas diretamente. Guarda só
 * período e interesses; nome e curso são de {@code usuario}, no módulo Identidade, e são
 * lidos por {@code identidade.UsuarioConsulta}. O usuário é referenciado só pelo id
 * ({@code usuario_id}), sem FK nem relação JPA. Organizado como {@code identidade}:
 * {@code web}, {@code aplicacao}, {@code dominio}. Por enquanto só o {@code dominio}
 * (entidade e repository); os endpoints das Stories 4.1, 4.2 e 4.4 dependem do contrato no
 * {@code openapi.yaml} (AD-4). Ainda não publica interface na raiz.</p>
 */
package br.edu.unicatolica.pacext.perfil;
