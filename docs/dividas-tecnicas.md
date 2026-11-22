# Dívidas técnicas

Problemas conhecidos que ainda não têm história nem PR. Quando um item virar história, anote o número dela em **Estado**. Quando for resolvido, remova o item da tabela e cite o PR na mensagem de commit.

| # | Dívida | Estado |
|---|---|---|
| DT-4 | E-mail de confirmação do cadastro não chega ao usuário | Código pronto; falta configurar a Brevo no Render |
| DT-5 | Nome de comunidade sem limite de tamanho no backend | Aberta |
| DT-6 | Produção sem administrador e checklist do primeiro deploy | Aberta, tratar no primeiro deploy |
| DT-7 | `select` do formulário sem a seta do redesign | Aberta, sem história ainda |
| DT-8 | Moderador e administrador não abrem notificações no celular | Aberta, sem história ainda |
| DT-9 | Itens de "Em breve" sem ícone no menu lateral | Aberta, sem história ainda |
| DT-10 | Coluna lateral vazia até uma tela registrar conteúdo | Aberta, depende do KAN-93 |
| DT-11 | Contratos implícitos do `UcInput` (id) e do `UcMenu` (`gatilho`) | Aberta, sem história ainda |
| DT-12 | Painel de notificações do desktop empurra o menu lateral | Aberta, sem história ainda |
| DT-15 | Mídia: limitações conhecidas do MVP | Aberta, sem história ainda |
| DT-16 | Mídia: URLs assinadas expiram em 10 minutos | Aberta, sem história ainda |
| DT-17 | Mídia: moderador não vê o anexo da postagem denunciada | Aberta, sem história ainda |

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

## DT-13. Método HTTP não permitido devolve 500 em vez de 405

- **Hoje:** `ErroInternoExceptionMapper` pega também a `NotAllowedException` do JAX-RS. Um `POST`/`PUT`/`DELETE` numa rota que só tem `GET` (ex.: `/admin/auditoria`) responde 500 `ERRO_INTERNO` em vez de 405. Nunca chega a 2xx, então não abre brecha, mas polui o log de erros e o `AuditoriaAdminResourceTest.nenhumaRotaAlteraOuApagaLog` só consegue afirmar `>= 400`.
- **Correção esperada:** deixar `WebApplicationException` (405, 404 de rota, 415) passar com o próprio status, no envelope `{"error": {...}}`, e trocar o teste por `405`.
- **Prazo:** sem prazo; qualquer ticket que mexa nos mappers de `compartilhado/erro/`. **Estado:** sem história ainda.

## DT-14. Logs de auditoria crescem sem retenção nem exportação

- **Hoje:** `log_auditoria` só cresce, e a tela do KAN-90 só consulta. Sem política de retenção, arquivamento ou exportação (fora do escopo do KAN-90).
- **Correção esperada:** definir retenção e exportação quando o volume preocupar (referência: a meta de 100 mil registros do RNF83.1) e rever os índices de `infraestrutura-002`.
- **Prazo:** quando o volume de produção chegar perto de 100 mil registros. **Estado:** sem história ainda.

## DT-15. Mídia: limitações conhecidas do MVP

- **Hoje:** o KAN-128 entregou anexo de postagem e foto de perfil com estas lacunas aceitas:
  1. **Arquivo órfão:** arquivo enviado e nunca associado a uma postagem ou ao perfil (usuário desistiu da postagem, ou a criação falhou depois do upload) continua no bucket e na tabela `arquivo`; nada limpa. Foto substituída ou removida não entra aqui: `PerfilService.definirFoto`/`removerFoto` chamam `MidiaServiceImpl.liberar`, que apaga o objeto e a linha.
  2. **Um anexo por postagem** e sem miniaturas: o card carrega a imagem original (até 2 MB). O mesmo vale para a foto de perfil: avatares de 34 px baixam o original, e a URL assinada é refeita a cada requisição, então o navegador nunca reaproveita o cache.
  3. **Limite de corpo global:** `quarkus.http.limits.max-body-size=6M` vale para toda a API, não só para `POST /arquivos`. Cliente que não manda `Expect: 100-continue` pode ver a conexão cair (reset) em corpo acima de 6 MB em vez do 400; por isso o front valida o tamanho antes de enviar. O `LimiteDeCorpoHandler` só intercepta corpo com `Content-Length`: corpo chunked (sem esse cabeçalho) acima do limite cai no 413 puro do Quarkus ou no reset de conexão. Os códigos `CORPO_MUITO_GRANDE` do handler constam só na descrição de erro compartilhada do contrato.
  4. **Upload dentro da transação:** `ArquivoService` grava no S3 dentro da transação do banco (troca consciente, por simplicidade). Falha do banco depois do upload deixa objeto órfão, e a transação fica aberta durante a chamada de rede. O mesmo vale para a remoção: `MidiaServiceImpl.liberar`, chamado por `PerfilService.definirFoto`, apaga o objeto antigo dentro da transação ainda aberta; se o commit falhar depois, o banco desfaz mas o objeto já se foi (a foto anterior fica com URL quebrada).
  5. **Foto não aparece em todo lugar:** a barra superior e o avatar do feed da Home ainda usam iniciais, porque `/usuarios/me` não devolve `fotoUrl`. Autores em Enquetes e Moderação também não têm `fotoUrl`.
  6. **`docker-compose up` não tem S3:** o compose desliga o Dev Services e não configura armazenamento, então `POST /arquivos` responde 500 nesse modo (o resto funciona). Use `quarkus:dev` no host, ou aponte `ARMAZENAMENTO_*` e `QUARKUS_S3_PATH_STYLE_ACCESS=true` para um MinIO próprio.
  7. **Docker obrigatório e imagem grande:** `quarkus:dev`, `./mvnw test` e o job "E2E backend" do CI sobem LocalStack (cerca de 400 MB no primeiro pull).
- **Correção esperada:**
  1. Rotina periódica que apaga arquivo com `em_uso=false` mais velho que um prazo.
  2. Lista de anexos por postagem e geração de miniaturas, se o produto pedir. Para o cache das fotos, arredondar o instante da assinatura a uma janela (a URL repete dentro dela) ou um endpoint de redirecionamento com `Cache-Control`.
  3. Limitar o corpo só em `/arquivos` (ou tratar o reset) e, se valer, mover o upload para depois do commit, com compensação (e apagar o objeto antigo só depois do commit em `liberar`). Para corpo chunked, limite no nível do servidor.
  4. Devolver `fotoUrl` em `/usuarios/me` e nos autores de enquetes e moderação; decidir se o compose ganha um serviço MinIO.
- **Prazo:** sem prazo; a limpeza de órfãos antes de o bucket pesar no plano gratuito. **Estado:** sem história ainda.

## DT-16. Mídia: URLs assinadas expiram em 10 minutos

- **Hoje:** `midia.url-validade-minutos` vale 10. Um feed deixado aberto por mais tempo mostra links de PDF mortos e imagens de anexo quebradas até recarregar a lista.
- **Correção esperada:** (a) endpoint `GET /arquivos/{id}/conteudo` que confere o acesso e responde 302 para uma URL assinada nova (exige mudança de contrato); ou (b) o front refazer a busca/tentar de novo ao falhar; ou (c) validade maior, como 60 minutos (uma propriedade; testes e docs fixam 10).
- **Prazo:** sem prazo. **Estado:** sem história ainda.

## DT-17. Mídia: moderador não vê o anexo da postagem denunciada

- **Hoje:** `PublicacaoModeravel`/`PublicacaoModeracao` não carregam `arquivoId` e `features/moderacao` não renderiza anexo; o moderador julga só pelo texto.
- **Correção esperada:** incluir `arquivoId` em `PublicacaoModeravel`, resolver pela `midia.MidiaConsulta` no resource de moderação, atualizar o contrato e as telas de moderação. Precisa de ticket próprio.
- **Prazo:** sem prazo; antes de a moderação depender de anexos. **Estado:** sem história ainda.
