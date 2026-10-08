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
