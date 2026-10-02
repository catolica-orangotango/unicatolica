# Decisão: módulo Notificações e gatilho de onboarding progressivo

- **Data:** 2026-09-30
- **Estado:** aceita
- **Arquitetura (AD-1 a AD-11):** sem alteração — mais um módulo folha-consumidor, mesmo padrão de Comunidades observando eventos de Identidade

## Contexto

Story 10.1 (Epic 10) pede um atalho de notificações na sidebar. A primeira notificação a existir é o gatilho de onboarding progressivo já desenhado no Epic 4 (Story 4.3, RF20.1): a partir do 2º login, se o aluno ainda não definiu nenhum interesse no perfil acadêmico, ele recebe um aviso lembrando de completar o perfil.

Esta implementação começou numa branch separada (`Epico-10-10.1-notificacoes-de-resposta`) antes de o Perfil Acadêmico (Épico 4) estar em `main`. No meio do trabalho, `main` recebeu a implementação de Perfil Acadêmico de outro integrante (Luis Fernando — KAN-39/40/42), com uma diferença de contrato: curso do usuário passou de texto livre (`curso: string`) para `cursoId: Long` referenciando uma nova entidade `identidade.dominio.Curso` (`GET /cursos`). Havia também uma implementação própria de Perfil Acadêmico nesta branch, com o contrato antigo.

## Decisão

Descartar a implementação própria de Perfil Acadêmico e reconstruir Notificações sobre a versão de `main` (AD-3: main é sempre a fonte de verdade em conflito). Notificações em si não tinha equivalente em nenhuma branch — só a integração com Perfil precisou ser adaptada ao novo contrato (`identidade.UsuarioCadastro`/`DadosCadastrais`, `Set<String>` em vez de `List<String>` para interesses).

### Desenho

- **`notificacoes/`** — módulo novo, dono da tabela `notificacao`. Raiz publica `NotificacaoEmissor` (`notificar`, `possuiNaoLidaDoTipo`, `marcarComoLidaPorTipo`) e `TipoNotificacao` (hoje só `ONBOARDING_PERFIL`). `aplicacao.NotificacaoService` implementa a interface e cobre os casos de uso do próprio módulo (listar paginado, marcar uma notificação como lida). Endpoints: `GET /notificacoes/me`, `POST /notificacoes/{id}/lida`.
- **`identidade.LoginRealizado`** — evento novo, mesmo padrão de `UsuarioCadastrado`/`CursoDoUsuarioAlterado`: `AuthService.autenticar` incrementa `Usuario.totalLogins` e dispara o evento só para perfil `ALUNO` (migration `identidade-006-add-total-logins.xml`).
- **`perfil.aplicacao.NotificarPerfilIncompletoNoLogin`** — observer síncrono de `LoginRealizado`. A partir do 2º login, se `PerfilAcademicoRepository.buscarPorUsuarioId(...)` não tiver interesses, pede uma notificação via `NotificacaoEmissor` — sem duplicar se já existe uma não lida do mesmo tipo. Todo o corpo roda em try/catch: uma falha aqui nunca pode impedir o login.
- **`PerfilService.salvar`** — ao gravar um perfil com pelo menos um interesse, marca o aviso de onboarding como lido via `NotificacaoEmissor.marcarComoLidaPorTipo`, sem esperar o usuário abrir a lista de notificações.
- **Frontend** — `features/notificacoes/notificacoes.service.ts` (cache compartilhada em signal, mesmo padrão de `ComunidadesService`); sininho na sidebar do `Shell` vira um botão com badge de não lidas e abre um painel dropdown (mesmo padrão visual do menu da conta), sem introduzir um componente de Modal genérico no design system.

## Consequências

- Nenhum código do Perfil Acadêmico de Luis foi alterado além da injeção de `NotificacaoEmissor` em `PerfilService` e da atualização do `package-info.java`.
- `identidade` continua módulo folha: `LoginRealizado` é só mais um evento CDI que ela dispara, sem importar nada de volta.
- Quem quiser reagir a outro tipo de notificação no futuro (ex.: resposta a postagem, Epic 10 adiante) só precisa de um novo valor em `TipoNotificacao` e um observer — o módulo Notificações em si não muda.
