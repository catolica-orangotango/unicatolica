# Fluxo de status das tarefas no Jira

- **Data:** 02/10/2026
- **Status:** proposta, para o time aprovar

## Contexto

O projeto KAN tem 6 status (A fazer, Fazendo, Em Análise, Revisão Merge, Teste, Feito), mas nenhum deles tem uma definição escrita. Cada um usa como entende. Na retro do épico 1, a KAN-18 ficou em "Em Análise" com o código já no `main` desde o PR #5 ([retro](../../_bmad-output/implementation-artifacts/epic-1-retro-2026-08-29.md)). Sem um combinado, o quadro não mostra o estado real das entregas. Também não dá para automatizar transições (ex.: PR mergeado → Teste) sem saber o que cada status significa.

## Decisão

```mermaid
stateDiagram-v2
    direction LR
    [*] --> AFazer
    AFazer --> Fazendo
    Fazendo --> RevisaoMerge: PR aberto
    RevisaoMerge --> Fazendo: CI vermelho ou ajuste pedido
    RevisaoMerge --> Teste: PR mergeado (automação)
    Teste --> Feito: validado no ambiente
    Teste --> Fazendo: defeito encontrado
    Feito --> [*]

    AFazer: A fazer
    RevisaoMerge: Revisão Merge
```

| Status | Significa | Entra quando | Sai quando |
|---|---|---|---|
| **A fazer** | Priorizada, ninguém começou | A tarefa é criada ou puxada para a sprint | Alguém assume e começa |
| **Fazendo** | Em desenvolvimento, com responsável | O responsável começa, ou a tarefa volta de Revisão Merge/Teste | O PR é aberto |
| **Revisão Merge** | PR aberto, esperando os 3 checks do CI e o merge | O PR com a chave `KAN-xx` é aberto | O PR é mergeado (→ Teste) ou precisa de mudança (→ Fazendo) |
| **Teste** | Código no `main`, falta validar funcionando | O PR é mergeado (automática, ver abaixo) | Validado (→ Feito) ou defeito encontrado (→ Fazendo) |
| **Feito** | Entregue e validado | O teste passa | — |

### Regras

- **Chave no PR:** todo PR leva a chave da tarefa (`KAN-xx`) no título, na branch ou nos commits. Sem a chave, nem a integração com o GitHub nem a automação encontram a tarefa.
- **Teste é validação funcional, não teste automatizado.** O teste automatizado já é parte da entrega e roda no CI antes do merge (`AGENTS.md`). Em Teste, alguém usa a funcionalidade de verdade no ambiente onde ela deve funcionar: em produção (Render) quando a tarefa depende de configuração do ambiente, como a KAN-49, ou local quando não depende.
- **Defeito em Teste volta para Fazendo**, com um comentário explicando o problema. Correção pequena pode sair num PR novo na mesma tarefa.
- **Automação:** a regra "PR mergeado → Teste" do Jira faz a transição de Revisão Merge para Teste. Ela depende do app GitHub for Jira conectado ao repositório.

### Em Análise

O status "Em Análise" fica fora do fluxo. As opções são:

1. **Remover do quadro** (recomendado): o que ele cobria ("esperando alguém olhar") já está em Revisão Merge ou Teste.
2. **Usar antes de Fazendo**, para tarefas que precisam de refinamento ou de uma decisão antes de começar (A fazer → Em Análise → Fazendo).

As tarefas que estão hoje em Em Análise passam para o status que corresponde ao estado real delas.

## Consequências

- O quadro mostra onde cada entrega está: em código, esperando merge ou esperando validação.
- "Feito" passa a querer dizer "funciona", não só "mergeado". Isso evita repetir o caso da KAN-18 e o da DT-4, em que o código estava no `main` mas o e-mail não chegava em produção.
- Quem mergeia o PR (ou o responsável pela tarefa) precisa voltar à tarefa para validar. Sem isso, as tarefas se acumulam em Teste.
