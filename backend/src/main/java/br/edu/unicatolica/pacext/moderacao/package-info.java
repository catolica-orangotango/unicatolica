/**
 * Módulo de Moderação (RF75–RF80).
 *
 * <p>Dono das tabelas {@code denuncia}, {@code acao_moderacao} e {@code restricao_usuario}
 * (AD-3 — limites de módulo dentro do monólito): nenhum outro módulo escreve nelas
 * diretamente. Conteúdo denunciado e usuários são referenciados só pelo id, sem FK nem
 * relação JPA. O estado do conteúdo (oculto/removido) não fica aqui: pertence ao módulo
 * dono do conteúdo e é alterado pela interface publicada dele. A identidade do
 * denunciante é guardada só para barrar denúncia duplicada e nunca sai para o moderador
 * (RF77.1). Toda ação também vai para o {@code log_auditoria} pelo {@code AuditoriaService}
 * (AD-11, RF79.1). Organizado como {@code identidade}: {@code web}, {@code aplicacao},
 * {@code dominio}. Implementa denunciar postagem (Story 12.1, {@code POST /denuncias}), a fila
 * e a análise do moderador (Story 12.4, {@code GET /moderacao/denuncias[/{id}]}), ocultar e
 * restaurar (Story 12.5) e descartar denúncia improcedente
 * ({@code POST /moderacao/denuncias/{id}/ocultacao|restauracao|descarte}), só para perfil
 * {@code MODERADOR}. A postagem é lida e ocultada/restaurada por
 * {@code publicacoes.PublicacaoModeracao}; o autor, por {@code identidade.UsuarioConsulta}.
 * Notificação ao autor (RF78.2) espera o módulo Notificações. Triagem pelo agente de IA
 * (Story 12.2, RF75.1–RF75.3) segue DEFERRED; remover (12.6), restringir (12.7) e escalonar
 * (12.8) ainda não têm endpoint. Ainda não publica interface na raiz.</p>
 */
package br.edu.unicatolica.pacext.moderacao;
