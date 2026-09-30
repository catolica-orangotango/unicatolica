/**
 * Módulo de Moderação (RF75–RF80).
 *
 * <p>Dono das tabelas {@code denuncia}, {@code acao_moderacao} e {@code restricao_usuario}
 * (AD-3 — limites de módulo dentro do monólito): nenhum outro módulo escreve nelas
 * diretamente. Conteúdo denunciado e usuários são referenciados só pelo id, sem FK nem
 * relação JPA. O estado do conteúdo (oculto/removido) não fica aqui: pertence ao módulo
 * dono do conteúdo e será alterado pela interface publicada dele. A identidade do
 * denunciante é guardada só para barrar denúncia duplicada e nunca sai para o moderador
 * (RF77.1). Toda ação também vai para o {@code log_auditoria} pelo {@code AuditoriaService}
 * (AD-11, RF79.1). Organizado como {@code identidade}: {@code web}, {@code aplicacao},
 * {@code dominio}. Por enquanto só o {@code dominio}; os endpoints dependem do contrato no
 * {@code openapi.yaml} (AD-4). Triagem pelo agente de IA (Story 12.2, RF75.1–RF75.3) segue
 * DEFERRED. Ainda não publica interface na raiz.</p>
 */
package br.edu.unicatolica.pacext.moderacao;
