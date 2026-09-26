/**
 * Módulo de Perfil Acadêmico (RF14–RF20, RF20.2 — RF20.1 fica de fora desta fatia).
 *
 * <p>Dono exclusivo da tabela {@code perfil_academico}/{@code perfil_interesse} (AD-3):
 * nenhum outro módulo lê ou escreve nelas diretamente. Organizado como {@code identidade/}
 * — {@code web/} (Resource/DTO), {@code aplicacao/} (Service), {@code dominio/} (entidade,
 * Repository) — ver {@code docs/como-funciona.md}.</p>
 *
 * <p><b>Por que não duplica nome/curso:</b> esses dois campos já são de Identidade
 * (capturados no cadastro, Story 1.2) — este módulo os lê por
 * {@link br.edu.unicatolica.pacext.identidade.UsuarioConsulta#buscarResumos} e, quando o
 * aluno edita o próprio nome/curso aqui (RF15/RF16), grava de volta em Identidade via
 * {@link br.edu.unicatolica.pacext.identidade.UsuarioAtualizacao} — nunca uma cópia
 * própria. {@code perfil_academico} guarda só o que é genuinamente deste módulo:
 * {@code periodo} e a lista de {@code interesses} (ver
 * {@code docs/decisoes/2026-09-26-modelo-epico-4-perfil.md}).</p>
 *
 * <p>Ao editar o curso (RF16), ressincroniza o auto-join chamando diretamente
 * {@link br.edu.unicatolica.pacext.comunidades.AutoJoinCursoService#sincronizarCursoDoAluno}
 * — a mesma interface que a Story 2.3 já usa no cadastro, exatamente como o javadoc dela
 * já previa ("futuramente Perfil Acadêmico/Epic 4").</p>
 *
 * <p><b>Dependências:</b> {@code compartilhado}, {@code identidade} (só a raiz do
 * pacote), {@code comunidades} (só a raiz do pacote) — nenhuma leitura/escrita fora das
 * APIs públicas desses módulos (AD-3, verificado por {@code ArquiteturaTest}).</p>
 *
 * <p>RF20.1 (notificação de onboarding progressivo) fica de fora desta fatia — depende do
 * módulo Notificações, que ainda não existe.</p>
 */
package br.edu.unicatolica.pacext.perfil;
