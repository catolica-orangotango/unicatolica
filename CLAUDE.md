# CLAUDE.md

Regras gerais do projeto: @AGENTS.md

## Uso de IA: branch sempre com a chave do ticket

A integração GitHub for Jira só associa branch, commits e PR a um ticket se a chave
`KAN-<número>` estiver no nome da branch. As automações de status dependem disso
(ver `docs/decisoes/2026-10-08-branch-com-chave-do-ticket.md`).

- Toda branch criada pela IA começa pela chave do ticket: `KAN-<número>-<descricao-curta>`,
  ex.: `KAN-48-confirmar-senha`. O título do PR leva a chave no final, entre parênteses:
  `feat(identidade): campo confirmar senha no cadastro (KAN-48)`.
- Antes de criar a branch, descubra o ticket. Com integração com o Jira (projeto KAN em
  unicatolica-sc.atlassian.net), procure o ticket da tarefa e confirme com o usuário. Sem
  integração, ou se não achar o ticket, peça o número ao usuário. Nunca invente a chave e
  nunca crie a branch sem ela.
- Se o usuário criou a branch manualmente sem `KAN-<número>` no nome, avise-o antes de
  continuar: a branch precisa ter a chave do ticket para o PR ser aprovado; sem ela, o PR
  será rejeitado. Sugira renomear com `git branch -m KAN-<número>-<descricao-curta>`.

## Uso de IA: análise de PR e teste só por outro colaborador

A IA pode revisar PRs (ticket em Em Análise PR) e testar tickets (status Teste), mas só a
pedido de um colaborador que **não** é o autor do PR nem o responsável pelo ticket. Esse
colaborador confere o resultado da IA antes de aprovar, recusar ou mover o ticket. Não
precisa refazer a revisão linha a linha: a AD-8 continua sem revisão manual obrigatória (ver
`docs/decisoes/2026-10-08-revisao-e-teste-por-outro-colaborador.md`).

- Antes de revisar ou testar, compare o usuário da sessão com o responsável pelo ticket e
  com o autor do PR. Use a conta do Jira (`atlassianUserInfo`) e o `gh api user`; sem
  integração, pergunte ao usuário quem ele é no projeto.
- Se o usuário for o autor ou o responsável, não faça a revisão nem o teste. Avise que isso
  precisa ser feito por outro colaborador, e não transicione o ticket para Teste, Feito ou
  Recusa em nome dele.
- Se for outro colaborador, faça a revisão ou o teste e apresente o resultado (achados,
  evidências, recomendação) para ele conferir. Só publique a revisão no GitHub, comente
  no Jira ou mova o ticket depois que ele confirmar.
