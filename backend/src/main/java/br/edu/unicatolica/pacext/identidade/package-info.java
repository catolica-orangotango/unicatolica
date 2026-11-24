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
 * {@link br.edu.unicatolica.pacext.identidade.DadosCadastrais} (nome, curso e foto, lidos e
 * gravados pelo Perfil Acadêmico). A foto de perfil é só a coluna {@code usuario.foto_arquivo_id}
 * (id do arquivo em {@code midia}, sem FK), gravada por {@code UsuarioCadastro.atualizarFoto} e
 * exposta como {@code fotoArquivoId} em {@code UsuarioResumo}/{@code DadosCadastrais}. Também implementa
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
 * <p>O cadastro exige o aceite dos Termos de Uso e da Política de Privacidade (KAN-131):
 * {@code usuario.termos_aceitos_em} e {@code usuario.termos_versao} guardam quando e qual versão
 * (config {@code identidade.termos.versao}); sem aceite, 422 {@code TERMOS_NAO_ACEITOS}.</p>
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
 * A gestão de usuários (KAN-83, {@code UsuarioAdminService}) lista, altera o perfil e
 * desativa/reativa contas em {@code /admin/usuarios}: as duas alterações derrubam a sessão
 * do usuário (mesmo mecanismo do logout), vão para a auditoria, e o sistema nunca fica sem
 * administrador ativo. Conta desativada ({@code usuario.ativo = false}) não faz login
 * ({@code ContaDesativadaException}, 401 {@code CONTA_DESATIVADA}).
 * A consulta de logs de auditoria (KAN-90, RF83, {@code AuditoriaAdminService}) mora aqui
 * porque a administração de plataforma é de Identidade: {@code GET /admin/auditoria} e
 * {@code GET /admin/auditoria/filtros}, só {@code ADMINISTRADOR}, somente leitura. Lê pela
 * interface {@code compartilhado.auditoria.AuditoriaConsulta} e completa o autor (nome e
 * e-mail) pela tabela {@code usuario}; consultar não gera log.
 * Também a lista de cursos ({@code GET /cursos}, público só para leitura), usada
 * pelo select do cadastro, e a manutenção dela pelo administrador (KAN-44):
 * {@code POST /cursos}, {@code PUT /cursos/{id}} (renomear, ativar/desativar) e
 * {@code GET /admin/cursos} (todos, com os desativados). O curso do usuário é só o
 * {@code curso_id}; o nome vem de {@code curso.nome} ({@code Usuario.cursoNome}).</p>
 */
package br.edu.unicatolica.pacext.identidade;
