/**
 * Módulo de Notificações (Epic 10, Story 10.1, RF20.1 herdado do gatilho de onboarding do
 * Epic 4).
 *
 * <p>Dono exclusivo da tabela {@code notificacao} (AD-3): nenhum outro módulo escreve nela
 * diretamente — o único ponto de escrita/consulta externo é a interface publicada
 * {@link NotificacaoEmissor}. Hoje o único emissor é {@code perfil.aplicacao
 * .NotificarPerfilIncompletoNoLogin}, que observa {@code identidade.LoginRealizado} e pede
 * um aviso de {@link TipoNotificacao#ONBOARDING_PERFIL} quando o aluno ainda não definiu
 * interesses no 2º login em diante. Organizado como {@code identidade}/{@code comunidades}:
 * {@code web}, {@code aplicacao}, {@code dominio}. Endpoints próprios ({@code GET
 * /notificacoes/me}, {@code POST /notificacoes/{id}/lida}) servem a lista da sininho da
 * shell do frontend.</p>
 *
 * <p>{@link TipoNotificacao#RESPOSTA_POSTAGEM}, {@link TipoNotificacao#MENCAO} e
 * {@link TipoNotificacao#CONVITE_ENQUETE} (RF65–RF67, Story 10.1/KAN-47) estão reservados no
 * enum mas sem emissor: dependem de Publicações ganhar resposta/comentário, de um módulo com
 * texto livre reconhecer menção, e do módulo Enquetes existir, respectivamente — nenhum dos
 * três tem código ainda.</p>
 */
package br.edu.unicatolica.pacext.notificacoes;
