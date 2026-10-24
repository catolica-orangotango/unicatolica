/**
 * Módulo de Identidade e Acesso (RF01–RF13).
 *
 * <p>Dono das tabelas {@code usuario} e {@code curso} (AD-3 — limites de módulo dentro do monólito):
 * nenhum outro módulo lê ou escreve nela diretamente; outros módulos guardam só o
 * {@code usuario_id} (sem FK nem relação JPA) e leem pela API pública abaixo.
 * Organizado em subpacotes por camada — {@code web} (Resource/DTO), {@code aplicacao}
 * (Service, regra de negócio), {@code dominio} (entidade, Repository, exceções de
 * domínio) — ver {@code docs/como-funciona.md}.</p>
 *
 * <p><b>API pública</b> (raiz do pacote): {@link br.edu.unicatolica.pacext.identidade.UsuarioConsulta}
 * e {@link br.edu.unicatolica.pacext.identidade.UsuarioResumo} (leitura em lote), e
 * {@link br.edu.unicatolica.pacext.identidade.UsuarioCadastro} com
 * {@link br.edu.unicatolica.pacext.identidade.DadosCadastrais} (nome e curso, lidos e
 * gravados pelo Perfil Acadêmico). Também implementa
 * {@code compartilhado.seguranca.SessaoConsulta}, usada pelo filtro de logout.</p>
 *
 * <p><b>Eventos que dispara</b> (CDI, síncronos, na transação de quem dispara):
 * {@link br.edu.unicatolica.pacext.identidade.UsuarioCadastrado} ao fim do cadastro,
 * {@link br.edu.unicatolica.pacext.identidade.CursoDoUsuarioAlterado} quando o curso do
 * aluno muda (os dois levam o id do curso), e, quando o administrador mexe na lista de
 * cursos, {@link br.edu.unicatolica.pacext.identidade.CursoCadastrado} e
 * {@link br.edu.unicatolica.pacext.identidade.CursoRenomeado}, que Comunidades escuta para
 * criar e renomear a comunidade de curso.</p>
 *
 * <p><b>Dependências:</b> só {@code compartilhado} (módulo folha, verificado por
 * {@code ArquiteturaTest}).</p>
 *
 * <p>Implementa Story 1.2 (cadastro), Story 1.3 (confirmação de e-mail), Story 1.4
 * (login/emissão de JWT), Story 1.5 (bloqueio de acesso/restrição por perfil, via
 * {@code UsuarioAutenticado} + {@code /usuarios/me}/{@code /usuarios/{id}}) e Story 1.6
 * (logout), e a renovação da sessão por inatividade ({@code POST /auth/refresh}, KAN-78).
 * O perfil de plataforma
 * {@code ADMINISTRADOR} (constantes em {@code compartilhado.seguranca.Perfis}; regra de
 * autorização em {@code UsuarioAutenticado.podeModerar/exigirModerador/exigirAdministrador})
 * tem a rota base {@code GET /admin/painel} ({@code AdminResource}/{@code AdminService}) e o
 * usuário de teste {@code admin.teste@catolicasc.edu.br}, semeado só no contexto {@code dev}.
 * Também a lista de cursos ({@code GET /cursos}, público só para leitura), usada
 * pelo select do cadastro, e a manutenção dela pelo administrador (KAN-44):
 * {@code POST /cursos}, {@code PUT /cursos/{id}} (renomear, ativar/desativar) e
 * {@code GET /admin/cursos} (todos, com os desativados). O curso do usuário é só o
 * {@code curso_id}; o nome vem de {@code curso.nome} ({@code Usuario.cursoNome}).</p>
 */
package br.edu.unicatolica.pacext.identidade;
