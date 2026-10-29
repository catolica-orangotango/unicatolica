# Dívidas técnicas

Problemas conhecidos que ainda não têm história nem PR. Quando um item virar história, anote o número dela em **Estado**. Quando for resolvido, remova o item da tabela e cite o PR na mensagem de commit.

| # | Dívida | Estado |
|---|---|---|
| DT-4 | E-mail de confirmação do cadastro não chega ao usuário | Código pronto; falta configurar a Brevo no Render |
| DT-5 | Nome de comunidade sem limite de tamanho no backend | Aberta |
| DT-7 | `select` do formulário sem a seta do redesign | Aberta, sem história ainda |
| DT-8 | Moderador e administrador não abrem notificações no celular | Aberta, sem história ainda |
| DT-9 | Itens de "Em breve" sem ícone no menu lateral | Aberta, sem história ainda |
| DT-10 | Coluna lateral vazia até uma tela registrar conteúdo | Aberta, depende do KAN-93 |
| DT-11 | Contratos implícitos do `UcInput` (id) e do `UcMenu` (`gatilho`) | Aberta, sem história ainda |
| DT-12 | Painel de notificações do desktop empurra o menu lateral | Aberta, sem história ainda |

## DT-4. E-mail de confirmação do cadastro não chega ao usuário

- **Hoje:** o código está pronto ([decisão de 01/10](decisoes/2026-10-01-envio-de-email.md)). O transporte é escolhido por `EMAIL_TRANSPORTE`, a Brevo é o provedor e o envio acontece depois do commit. Em produção ainda não há conta nem variáveis configuradas, então o e-mail continua sem chegar.
- **Correção esperada:**
  1. Criar a conta grátis na Brevo e verificar o remetente padrão `luis98.pereira@catolicasc.edu.br` (ou outro, definido em `MAIL_FROM`).
  2. No Render, definir `EMAIL_TRANSPORTE=brevo-api` e `BREVO_API_KEY`.
  3. Cadastrar um usuário de teste em produção e conferir se o e-mail chega (e se não cai no spam do domínio institucional).

## DT-5. Nome de comunidade sem limite de tamanho no backend

- **Hoje:** a coluna `comunidade.nome` é `varchar(150)`, mas `ComunidadeService.criarComunidadeAberta` só valida que o nome foi informado, e o `ComunidadeRequest` do `openapi.yaml` não tem `maxLength`. Nome com mais de 150 caracteres estoura no banco e volta 500, não 422. A tela de criar comunidade (KAN-22) barra no frontend com `maxlength`, mas uma chamada direta à API ainda cai no 500.
- **Correção esperada:**
  1. `maxLength: 150` em `nome` no `ComunidadeRequest` do `openapi.yaml`.
  2. `ComunidadeService` lança `ApiException.validacao` (422) acima de 150, com teste unitário e `@QuarkusTest` pelo HTTP.
  3. O `LIMITE_NOME_COMUNIDADE` do `comunidades.service.ts` continua igual ao do backend.
- **Prazo:** antes de liberar a criação de comunidade em produção para os alunos.

## DT-6. Produção sem administrador e checklist do primeiro deploy

- **Hoje:** o usuário `admin.teste@catolicasc.edu.br` é semeado só no contexto Liquibase `dev` (`identidade-008`). Em produção (`%prod...contexts=prod`) nenhum usuário tem o perfil `ADMINISTRADOR`, então `/admin` fica inalcançável. O Render ainda não foi configurado.
- **Decisão:** o primeiro administrador é promovido à mão, uma única vez, sem código novo. Um changeset ou um bootstrap por variável de ambiente deixaria um caminho permanente de elevação de privilégio ou dependeria da conta já existir na hora da migration.
- **Correção esperada (no primeiro deploy):**
  1. Não definir `QUARKUS_LIQUIBASE_CONTEXTS` no Render. A variável vence o `application.properties` e, com `dev`, o seed com senha pública rodaria em produção.
  2. Depois do primeiro deploy, conferir no banco que não existem `aluno.teste`, `moderador.teste` nem `admin.teste` (`SELECT email FROM usuario WHERE email LIKE '%.teste@%'`). Se existirem, apagar.
  3. A pessoa responsável se cadastra pela tela normal e confirma o e-mail. Depois, no console do Neon: `UPDATE usuario SET perfil = 'ADMINISTRADOR' WHERE email = '<e-mail dela>';`. O perfil vale no próximo login.
  4. Daí em diante, outros perfis passam a ser alterados pela tela de usuários (`/admin/usuarios`, KAN-83). O administrador não altera o próprio perfil, então o primeiro continua sendo promovido à mão.
- **Prazo:** antes de abrir o sistema em produção.

## DT-7. `select` do formulário sem a seta do redesign

- **Hoje:** o `select` com `ucInput` (`ui/field/_input.scss`, KAN-91) tem o contorno, o raio e os estados do redesign, mas mantém a seta nativa do navegador, diferente da seta `down` da folha `docs/design/kan-84/componentes.html`. Desenhar a seta exigiria `appearance: none` com um `background-image` em SVG, e o `scss-guard.spec.ts` reprova cor fora de token em `background`.
- **Correção esperada:**
  1. Pôr a seta como elemento (um `<uc-icon name="down">` posicionado pelo `<uc-field>` quando o controle é um `select`), com `appearance: none` no `.uc-input` de `select`, sem `background-image`.
  2. Conferir foco, erro e desabilitado no Vitest do campo e no axe das telas com `select` (cadastro).
- **Prazo:** no ticket de Entrar e Criar conta do redesign. **Estado:** sem história ainda.

## DT-8. Moderador e administrador não abrem notificações no celular

- **Hoje:** abaixo de 760px a barra de abas (`layout/shell/shell-tabbar/`) tem quatro abas, e para MODERADOR e ADMINISTRADOR a terceira é Denúncias, no lugar de Notificações. A gaveta "Suas comunidades" esconde os itens de navegação do menu lateral, e a barra superior só tem a gaveta e o menu da conta. Resultado: esses perfis não têm como abrir o painel de notificações no celular.
- **Correção esperada:**
  1. Decidir com o time onde fica Notificações para esses perfis (botão do sino na barra superior, item no menu da conta ou quinta aba).
  2. Implementar abrindo o mesmo painel do menu lateral, com a contagem no nome acessível e o foco voltando ao botão.
  3. Cobrir no `shell-sidebar.spec.ts` (e2e em 360px) e no axe como moderador.
- **Prazo:** antes do piloto com moderadores no celular. **Estado:** sem história ainda.

## DT-9. Itens de "Em breve" sem ícone no menu lateral

- **Hoje:** os itens inertes da seção "Em breve" do menu lateral (Busca, Mensagens, Criar enquete, Solicitações de fixação) aparecem só com o texto, enquanto os mockups do KAN-84 mostram um ícone em cada um. O conjunto do `UcIcon` (`ui/icon/icon.ts`) não tem ícone de mensagens, enquete nem fixação.
- **Correção esperada:**
  1. Acrescentar ao `UcIconName` os ícones que faltam (a partir da folha de componentes ou desenhados no mesmo traço de 1.75).
  2. Ligar um ícone a cada item de "Em breve", mantendo o item fora do `Tab` e com `aria-disabled`.
- **Prazo:** junto da primeira dessas funcionalidades que ganhar tela, ou antes, se o time preferir. **Estado:** sem história ainda.

## DT-10. Coluna lateral vazia até uma tela registrar conteúdo

- **Hoje:** a casca (`layout/shell/`) só cria o `<aside>` da coluna lateral quando a tela ativa registra um template pelo `ShellLateralService.definir`. Nenhuma tela faz isso ainda, então acima de 1180px o espaço de 340px previsto para "Esta semana" e descoberta fica vazio e o bloco de colunas não reproduz o mockup do Início.
- **Correção esperada:**
  1. O Início do aluno e do moderador registra seus blocos laterais (`<uc-card>`) ao entrar e limpa com `definir(null)` ao sair.
  2. As demais telas com coluna lateral fazem o mesmo nos próprios tickets.
- **Prazo:** no KAN-93, que liga o primeiro conteúdo à coluna lateral. **Estado:** depende do KAN-93.

## DT-11. Contratos implícitos do `UcInput` (id) e do `UcMenu` (`gatilho`)

- **Hoje:** dois comportamentos de `ui/` que pegam o consumidor de surpresa:
  1. Dentro de um `<uc-field>`, a diretiva `ucInput` sempre troca o `id` do controle pelo do campo (`uc-field-N`), mesmo quando o template declara um `id` explícito. Um `label for`, um teste ou um e2e que dependa desse `id` quebra em silêncio.
  2. O `<uc-menu>` não tem botão próprio: quando o consumidor é dono do botão que abre e fecha o menu, ele precisa passar esse botão em `gatilho`. Sem isso, o clique no botão conta como clique fora (o menu fecha e reabre), o foco não volta ao botão no Escape e sair do botão com `Tab` não fecha o menu.
- **Correção esperada:** escolher, para cada um, entre documentar ou corrigir:
  1. `UcInput`: respeitar o `id` explícito e fazer o `<uc-field>` usar o id do controle no `for` e nos ids da dica e do erro; ou documentar na JSDoc e no `DESIGN.md` que o id é sempre do campo.
  2. `UcMenu`: tornar `gatilho` obrigatório (`input.required`) ou documentar a exigência na JSDoc do componente e no `DESIGN.md`, com teste que falha sem ele.
- **Prazo:** antes de mais telas migrarem para `<uc-field>` e `<uc-menu>` (tickets das telas do redesign). **Estado:** sem história ainda.

## DT-12. Painel de notificações do desktop empurra o menu lateral

- **Hoje:** no desktop o painel de notificações abre no fluxo do menu lateral, logo abaixo do item (escolha do KAN-91 para não cobrir o item Perfil, que o axe acusava em `target-size`). Em janela baixa, o painel de até 360px empurra Perfil, "Suas comunidades" e o cartão da conta para baixo, e o menu passa a rolar.
- **Correção esperada:**
  1. Abrir o painel como overlay ancorado ao item (ou ao lado do menu), com alvo de pelo menos 24px nos itens que ele cobre, ou limitar a altura pelo espaço livre da janela.
  2. Conferir no e2e da casca em 1440 x 700 e no axe.
- **Prazo:** no ticket do Início do redesign ou no do módulo de notificações, o que vier primeiro. **Estado:** sem história ainda.
