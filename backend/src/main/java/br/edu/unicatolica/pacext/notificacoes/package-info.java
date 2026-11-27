/**
 * Módulo de Notificações (Epic 10, Stories 10.1 e 10.2, RF20.1 herdado do gatilho de
 * onboarding do Epic 4).
 *
 * <p>Dono exclusivo da tabela {@code notificacao} (AD-3): nenhum outro módulo escreve nela
 * diretamente — o único ponto de escrita/consulta externo é a interface publicada
 * {@link NotificacaoEmissor}. Hoje o único emissor é {@code perfil.aplicacao
 * .NotificarPerfilIncompletoNoLogin}, que observa {@code identidade.LoginRealizado} e pede
 * um aviso de {@link TipoNotificacao#ONBOARDING_PERFIL} quando o aluno ainda não definiu
 * interesses no 2º login em diante. Organizado como {@code identidade}/{@code comunidades}:
 * {@code web}, {@code aplicacao}, {@code dominio}. Endpoints próprios: {@code GET
 * /notificacoes/me} (RN03 limita {@code tamanho} a 1-20, RN04 devolve {@code totalNaoLidas}
 * calculado pelo backend), {@code GET /notificacoes/me/resumo} (RF69.4, consulta periódica
 * leve), {@code POST /notificacoes/{id}/lida}, {@code POST /notificacoes/me/lidas} (RF68) e
 * {@code DELETE /notificacoes/{id}} (RF84, exclusão física sem confirmação).</p>
 *
 * <p>{@link TipoNotificacao#RESPOSTA_POSTAGEM}, {@link TipoNotificacao#MENCAO} e
 * {@link TipoNotificacao#CONVITE_ENQUETE} (RF65–RF67, Story 10.1/KAN-47) estão reservados no
 * enum mas sem emissor: dependem de Publicações ganhar resposta/comentário, de um módulo com
 * texto livre reconhecer menção, e do módulo Enquetes existir, respectivamente — nenhum dos
 * três tem código ainda.</p>
 */
package br.edu.unicatolica.pacext.notificacoes;
