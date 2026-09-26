# Modelo de dados e limites de módulo do Épico 4 (Perfil Acadêmico)

**Contexto:** nenhum artefato de planejamento desenhava o modelo de dados do Perfil
Acadêmico em detalhe — só o ERD da Architecture Spine, que já registrava `PERFIL` como
tabela própria, separada de `USUARIO` (`USUARIO ||--o| PERFIL`). Este documento fecha as
lacunas que faltavam para implementar (2026-09-26).

## O que o módulo `perfil` guarda, e o que não guarda

`nome` e `curso` já são de Identidade (Story 1.2, capturados no cadastro) — o módulo
`perfil` **não duplica** esses dois campos numa tabela própria. Ele guarda só o que é
genuinamente seu: `periodo` (RF17) e a lista de `interesses` (RF18).

Ler o perfil completo (RF20) combina os dois pedaços em runtime:
`perfil.aplicacao.PerfilService` lê nome/curso via
`identidade.UsuarioConsulta.buscarResumos` (a API pública que já existia) e junta com
período/interesses da tabela própria.

## Como editar nome/curso sem violar AD-3

RF15/RF16 pedem editar nome e curso a partir da tela de perfil, mas `usuario` continua
sendo dono exclusivo de Identidade (AD-3) — nenhum outro módulo escreve nela
diretamente. A solução: Identidade publica uma segunda interface na raiz do pacote,
`identidade.UsuarioAtualizacao` (ao lado de `UsuarioConsulta`), implementada por
`UsuarioService`. `perfil.aplicacao.PerfilService` chama essa interface para gravar
nome/curso — o mesmo padrão de "outro módulo só fala com a raiz do pacote" que já valia
para leitura.

Identidade continua módulo folha (`identidade-e-folha`, `ArquiteturaTest`): publicar uma
interface nova não muda de quem ela depende, só o que ela oferece pra fora.

## Auto-join ao editar o curso (RF16)

`comunidades.AutoJoinCursoService.sincronizarCursoDoAluno` já foi desenhada (Story 2.3)
prevendo exatamente este caso — o javadoc da interface já citava "futuramente Perfil
Acadêmico/Epic 4" antes deste módulo existir. `PerfilService.salvar` chama essa mesma
interface: lê o curso anterior via `UsuarioConsulta` antes de gravar o novo, e sempre
invoca `sincronizarCursoDoAluno` depois — o método já é idempotente quando o curso não
muda (comparação case-insensitive interna), então não precisa de um "if" próprio aqui.

## Interesses: por que não há coluna de ordem no banco

A primeira versão usava `@OrderColumn` (Hibernate gerencia um índice numa coluna
própria). Isso quebrou contra Postgres de verdade: numa associação `mappedBy`
(bidirecional), o Hibernate só preenche a coluna de ordem numa 2ª volta de UPDATE, depois
do INSERT inicial — que falha se a coluna for NOT NULL (`ConstraintViolationException`,
pego só pelo teste `PerfilFluxoTest`, que roda contra Postgres real; o teste com
repositório mockado não captura isso). Como `interesses` é sempre substituído por
inteiro a cada edição (RF18: limpa e recria a lista inteira), a ordem de criação dos
`id`s já é a ordem de inserção — trocado para `@OrderBy("id ASC")`, que não precisa de
coluna nenhuma.

## Rota do frontend: uma tela só para os dois casos

RF20.2 diz "mesma tela do perfil próprio, sem controles de edição". Uma única
`Perfil` (`frontend/src/app/features/perfil/perfil.ts`) atende as duas rotas:

- `/perfil` (sem id) — o próprio perfil, editável.
- `/perfil/:id` — perfil de outro usuário, sempre só leitura, mesmo que `:id` calhe de
  ser o do próprio usuário logado (quem quer editar usa o link "Perfil" do menu da
  conta, que sempre aponta pra `/perfil` sem id — não há comparação de id no
  componente).

## Fora desta fatia

- **RF20.1** (notificação de onboarding progressivo) depende do módulo Notificações,
  que ainda não existe (só `package-info.java`). Card criado no Jira (Story 4.3) já
  marcado como fora de escopo.
- O atalho "clicar no nome/avatar de um post → perfil de quem postou" (RF20.2) depende
  do Épico 3 (Publicações) existir — a tela em si já funciona por rota direta
  (`/perfil/:id`); só falta o link de origem.
