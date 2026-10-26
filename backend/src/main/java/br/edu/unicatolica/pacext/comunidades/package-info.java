/**
 * Módulo de Comunidades (RF21–RF31).
 *
 * <p>Dono das tabelas {@code comunidade}/{@code comunidade_membro} (AD-3 — limites de
 * módulo dentro do monólito): nenhum outro módulo escreve nelas diretamente — o único
 * ponto de escrita externo é a interface publicada {@link AutoJoinCursoService}; leitura
 * (existe? é membro?) por {@link ComunidadeConsulta}, usada por Publicações. Escuta
 * {@code identidade.UsuarioCadastrado} para fazer o auto-join no cadastro e
 * {@code identidade.CursoDoUsuarioAlterado} para trocar de comunidade de curso (os dois
 * eventos levam o id do curso, e a comunidade de curso guarda {@code curso_id}, sem FK), e
 * {@code identidade.CursoCadastrado}/{@code identidade.CursoRenomeado} para criar e renomear a
 * comunidade de curso quando o administrador mexe na lista de cursos. Organizado
 * como {@code identidade}: {@code web}, {@code aplicacao}, {@code dominio}. Implementa
 * auto-join (Story 2.3/RF24.1), criação de comunidade aberta (Story 2.2/RF21-23) e
 * entrar/sair/listar/filtrar (Stories 2.4/2.5, RF24-28) e administração pelo administrador
 * da comunidade — remover membro, editar e excluir logicamente (Story 2.6, RF29-31) — entrada
 * rápida desta fatia, ver {@code docs/decisoes/2026-08-modelo-epico-2-comunidades.md}. A lista de
 * membros resolve nome e curso por {@code identidade.UsuarioConsulta}.
 * Comunidade excluída (coluna {@code ativa}) some das listagens e de
 * {@link ComunidadeConsulta#existe}, então os outros módulos deixam de aceitar interações nela.
 * Story 2.1 (RF21.2): a comunidade de curso nasce quando o administrador cadastra o curso
 * ({@code POST /cursos}, KAN-44); as 26 comunidades iniciais vêm do seed (changelog
 * {@code comunidades-002-seed-comunidades-curso.xml}), ligadas aos cursos por id em
 * {@code identidade-009}. Desativar o curso não altera a comunidade.</p>
 */
package br.edu.unicatolica.pacext.comunidades;
