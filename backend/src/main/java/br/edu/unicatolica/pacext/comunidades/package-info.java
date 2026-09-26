/**
 * Módulo de Comunidades (RF21–RF31).
 *
 * <p>Dono das tabelas {@code comunidade}/{@code comunidade_membro} (AD-3 — limites de
 * módulo dentro do monólito): nenhum outro módulo escreve nelas diretamente — o único
 * ponto de entrada externo é a interface publicada {@link AutoJoinCursoService}. Escuta
 * {@code identidade.UsuarioCadastrado} para fazer o auto-join no cadastro. Organizado
 * como {@code identidade}: {@code web}, {@code aplicacao}, {@code dominio}. Implementa
 * auto-join (Story 2.3/RF24.1), criação de comunidade aberta (Story 2.2/RF21-23) e
 * entrar/sair/listar/filtrar (Stories 2.4/2.5, RF24-28) — entrada rápida desta fatia, ver
 * {@code docs/decisoes/2026-08-modelo-epico-2-comunidades.md}. Story 2.1 (endpoint de admin criar comunidade
 * de curso) e Story 2.6 (administração) ficam de fora, bloqueadas pelo papel
 * {@code ADMINISTRADOR} de plataforma, que ainda não existe em Identidade; os 26 cursos da
 * instituição já estão pré-carregados via seed (changelog
 * {@code comunidades-002-seed-comunidades-curso.xml}).</p>
 */
package br.edu.unicatolica.pacext.comunidades;
