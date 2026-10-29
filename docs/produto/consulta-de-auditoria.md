# Consulta de logs de auditoria pelo administrador

- **Data:** 2026-10-26
- **Estado:** aprovado em 2026-10-26
- **Ticket:** KAN-90, bloqueado pelo KAN-84 (começa depois do ticket de implementação "casca, tokens e `ui/`" do redesign)
- **Requisito:** RF83 e subitens (estende a numeração do `prd.md`, que termina em RF82)
- **Decisão técnica:** [`docs/decisoes/2026-10-26-consulta-de-auditoria-pelo-administrador.md`](../decisoes/2026-10-26-consulta-de-auditoria-pelo-administrador.md)

## Contexto

A tabela `log_auditoria` (AD-11, RNF07) já registra login, logout, alteração de perfil, desativação de conta, cadastro de curso, criação e edição de comunidade, entre outros. Hoje a única forma de ler esses registros é abrir o `psql` no container ou no console do Neon:

```
 id | usuario_id |   modulo    |          acao              | entidade_afetada | entidade_id |        detalhes        |          criado_em
 23 |          3 | identidade  | CURSO_RENOMEADO            | Curso            |          27 |                        | 2026-10-26 19:54:06+00
 22 |            | comunidades | COMUNIDADE_CURSO_RENOMEADA | Comunidade       |          28 | cursoId=27             | 2026-10-26 19:54:06+00
 17 |          3 | identidade  | PERFIL_ALTERADO            | Usuario          |           1 | ADMINISTRADOR -> ALUNO | 2026-10-26 19:39:28+00
 16 |          1 | identidade  | LOGIN                      |                  |             | Login bem-sucedido.    | 2026-10-26 19:39:06+00
```

Isso exige credencial do banco, não tem controle de acesso por perfil e mostra só ids, sem dizer quem é o usuário 3. A trilha de auditoria existe, mas ninguém do produto consegue usá-la.

## História de usuário

**Como** administrador da plataforma
**Eu quero** consultar os logs de auditoria numa tela do painel `/admin`, filtrando por módulo, ação, entidade afetada, detalhes e data
**Para que** eu investigue o que aconteceu (quem alterou um perfil, quando uma conta foi desativada, quem criou uma comunidade) sem acesso ao banco

## Regras de negócio

| Id | Regra |
|---|---|
| RN01 | Só o perfil `ADMINISTRADOR`, com conta ativa, consulta logs. `ALUNO` e `MODERADOR` recebem 403; sem token, 401. A tela fica atrás do `adminGuard` e o atalho só aparece no painel `/admin`. |
| RN02 | A consulta é somente leitura. Não existe operação para editar, apagar ou exportar log pela aplicação (a trilha é imutável, RNF07). |
| RN03 | Ordem fixa: mais recente primeiro (`criado_em` decrescente, `id` decrescente para desempate). |
| RN04 | Paginação de 20 registros por página. O tamanho máximo aceito é 20; valor maior é trazido para 20 e valor menor que 1 vira 1, como em `GET /admin/usuarios`. |
| RN05 | Filtros se combinam com **E**. Filtro vazio ou só com espaços conta como "sem filtro". |
| RN06 | Módulo, ação e entidade afetada filtram por igualdade exata. As opções vêm dos valores que existem na tabela, e a lista de ações se restringe ao módulo escolhido. |
| RN07 | Detalhes filtra por "contém", sem diferenciar maiúsculas e minúsculas, a partir de 3 caracteres. Com 1 ou 2 caracteres o filtro é ignorado e a tela avisa "Digite ao menos 3 letras". |
| RN08 | Data de criação filtra por intervalo de dias, **de** e **até** inclusivos, no fuso `America/Sao_Paulo`. Pode-se informar só um dos dois. **De** depois de **até** devolve 422 `INTERVALO_DE_DATAS_INVALIDO`. |
| RN09 | Autor: mostra nome e e-mail do usuário que praticou a ação. `usuario_id` nulo é evento do sistema e aparece como "Sistema" (ex.: `COMUNIDADE_CURSO_RENOMEADA`, disparada por evento). Usuário que não existe mais aparece como "Usuário #id". |
| RN10 | Entidade afetada aparece como tipo e id (ex.: "Usuario #1"). Resolver o nome da entidade fica fora do escopo. |
| RN11 | Consultar logs **não** gera registro em `log_auditoria`. Cada mudança de filtro seria um registro, e a trilha ficaria poluída pelas próprias consultas. |
| RN12 | Detalhes são exibidos como texto puro (sem interpretar HTML). O log nunca guarda senha nem token, regra que já vale para quem grava. |

## Requisitos funcionais

### RF83: Consulta de logs de auditoria pelo administrador

O administrador consulta, numa tela própria do painel `/admin`, os registros de `log_auditoria`, com filtros e paginação.

- **RF83.1 Lista paginada.** Colunas: data e hora (horário de Brasília), autor (RN09), módulo, ação, entidade afetada (RN10) e detalhes. Mostra o total de registros encontrados e navegação entre páginas (anterior, próxima, página atual de N).
- **RF83.2 Filtros dinâmicos.** Módulo, ação, entidade afetada, detalhes e data de criação (de, até). Os filtros se aplicam sem botão "Buscar": seleção e data na hora, texto com espera de 300 ms depois da última tecla. Mudar um filtro volta para a página 1. Botão "Limpar filtros" zera tudo.
- **RF83.3 Filtros na URL.** O estado dos filtros e a página ficam nos parâmetros da URL (`/admin/auditoria?modulo=identidade&acao=PERFIL_ALTERADO&pagina=2`). Recarregar, voltar do navegador ou colar o link reproduzem a mesma consulta.
- **RF83.4 Opções dos filtros.** O backend devolve os módulos, ações (por módulo) e entidades afetadas existentes, para montar as listas de seleção.
- **RF83.5 Estados da tela.** Carregando (esqueleto), sem nenhum log, nenhum log para os filtros (com "Limpar filtros"), erro de carga (com "Tentar de novo"), e o aviso de intervalo de datas inválido no próprio campo.
- **RF83.6 Acesso.** Rota `/admin/auditoria`, com cartão "Logs de auditoria" no painel `/admin`, ao lado de Usuários e Cursos.

## Requisitos não funcionais

| Id | Requisito | Como verificar |
|---|---|---|
| RNF83.1 Desempenho | `GET /admin/auditoria` responde em **até 500 ms (p95)**, medidos no servidor, para qualquer combinação de filtros, com **100 mil registros** em `log_auditoria`. O mesmo vale para `GET /admin/auditoria/filtros`. Não inclui o tempo de "acordar" do Render ou do Neon no plano gratuito (risco já aceito em `docs/arquitetura.md`). | Script SQL que gera 100 mil registros com `generate_series`, 50 consultas por combinação de filtro, p95 registrado no ticket com o `EXPLAIN ANALYZE` das consultas. |
| RNF83.2 Segurança (RNF04) | A autorização é do backend. O `adminGuard` só esconde a tela; o endpoint recusa quem não é administrador. | `@QuarkusTest` com 401 e 403. |
| RNF83.3 Auditabilidade (RNF07, AD-11) | A leitura não altera a trilha: nenhum endpoint de escrita ou remoção, e a consulta não grava log (RN11). | Revisão do contrato e teste que confere a contagem da tabela antes e depois de consultar. |
| RNF83.4 Acessibilidade (RNF06) | WCAG 2.2 AA: tabela com cabeçalhos de coluna, todo filtro com rótulo, total de resultados anunciado por `aria-live`, operação completa por teclado, foco visível. | Teste do axe em `e2e/acessibilidade.spec.ts` e checklist de `docs/acessibilidade-checklist.md`. |
| RNF83.5 Padrão visual | Segue a direção do KAN-84: tokens novos, layout de tela de trabalho (menu + 1040px), campos, filtro, esqueleto, estado vazio e toast de `ui/`. Em 360px a tabela vira lista de registros empilhados e os filtros ficam num painel recolhível. | Comparação com os mockups do KAN-84 (`docs/design/kan-84/`), desktop e 360px. |
| RNF83.6 Contrato (AD-4, AD-5) | Endpoints descritos no `openapi.yaml` antes do código; lista no `PageResponse`; erros no envelope padrão. | Job "Contrato" do CI. |
| RNF83.7 Datas | API em UTC ISO-8601 (`Instant`); filtros de dia em `LocalDate`; tela em horário de Brasília. | Teste com registro perto da meia-noite UTC. |

## Contrato proposto

Detalhe final fica no `openapi.yaml`, no PR de contrato (AD-4).

```
GET /admin/auditoria?modulo=&acao=&entidadeAfetada=&detalhes=&de=AAAA-MM-DD&ate=AAAA-MM-DD&pagina=0&tamanho=20
200 PageResponse<LogAuditoriaResponse>
    { id, criadoEm, autor: { id, nome, email } | null, modulo, acao, entidadeAfetada, entidadeId, detalhes }
401 sem token · 403 não é ADMINISTRADOR · 422 INTERVALO_DE_DATAS_INVALIDO

GET /admin/auditoria/filtros
200 { modulos: [..], acoesPorModulo: { identidade: [..], comunidades: [..] }, entidadesAfetadas: [..] }
401 · 403
```

## Critérios de aceite

- [ ] Admin abre "Logs de auditoria" pelo painel `/admin` e vê os registros mais recentes primeiro, 20 por página, com data e hora em horário de Brasília, autor (nome e e-mail, ou "Sistema"), módulo, ação, entidade afetada e detalhes.
- [ ] Filtrar por módulo, ação, entidade afetada, detalhes (contém, a partir de 3 letras) e intervalo de datas atualiza a lista sem botão "Buscar", volta para a página 1 e combina os filtros com E.
- [ ] A lista de ações mostra só as ações do módulo escolhido.
- [ ] Os filtros e a página ficam na URL; recarregar ou voltar do navegador mantém a consulta. "Limpar filtros" volta para a lista completa.
- [ ] **De** depois de **até** mostra o erro no campo e o backend devolve 422 `INTERVALO_DE_DATAS_INVALIDO`.
- [ ] Paginação: `tamanho` acima de 20 devolve no máximo 20; anterior e próxima funcionam e mostram "página X de N".
- [ ] `ALUNO` e `MODERADOR` recebem 403 nos dois endpoints e voltam para o Início ao digitar `/admin/auditoria`; sem token, 401.
- [ ] Nenhum endpoint altera ou apaga log, e consultar não cria registro em `log_auditoria`.
- [ ] Com 100 mil registros, p95 de até 500 ms nos dois endpoints, para cada filtro sozinho e para a combinação de todos, com a medição e o `EXPLAIN ANALYZE` anexados ao ticket.
- [ ] Visual no padrão do KAN-84, em desktop e 360px; axe sem violações `serious`/`critical`.
- [ ] Testes: unitário do service (filtros vazios, tamanho limitado a 20, 422 de datas); `@QuarkusTest` dos dois endpoints (caminho feliz, cada filtro, combinação, paginação, 401, 403, 422); Vitest da tela e do serviço HTTP (conferindo o header `Authorization`); e2e mockado com mock que exige token, e2e `@backend` "admin altera um perfil → o log aparece filtrando por `PERFIL_ALTERADO`"; teste do axe.

## Roteiro de teste

1. `main` atualizada, `cd backend && ./mvnw quarkus:dev` e `cd frontend && npm start`.
2. Entrar com `admin.teste@catolicasc.edu.br` / `Senha123!` → "Administração" → "Logs de auditoria". Esperado: os logins recentes aparecem no topo.
3. Em "Usuários", alterar o perfil do `aluno.teste` para MODERADOR e voltar para "Logs de auditoria". Esperado: no topo, `PERFIL_ALTERADO`, autor Administrador Teste, entidade "Usuario #id", detalhes `ALUNO -> MODERADOR`. Voltar o perfil para ALUNO.
4. Filtrar módulo `identidade` e ação `PERFIL_ALTERADO`. Esperado: só as alterações de perfil; a URL contém os filtros. Recarregar: a mesma lista.
5. Digitar `MODERADOR` em detalhes. Esperado: só as alterações que envolvem moderador. Digitar só `MO`: aviso "Digite ao menos 3 letras".
6. Data **de** amanhã e **até** hoje. Esperado: erro no campo de data.
7. "Limpar filtros" e navegar para a página 2. Esperado: 20 registros por página e "página 2 de N".
8. Sair, entrar com `aluno.teste` e digitar `/admin/auditoria`. Esperado: volta para o Início.
9. No banco (`docker exec -it <container do Dev Services> psql -U pacext -d quarkus`), `select count(*) from log_auditoria;` antes e depois de usar os filtros. Esperado: só os logins e as alterações aumentam a contagem, não as consultas.

## Fora do escopo

- Filtro por autor (usuário que praticou a ação). Fácil de acrescentar depois, mas não foi pedido.
- Exportar (CSV, PDF) e política de retenção (apagar logs antigos). A tabela cresce sem limite; vale uma dívida técnica quando o volume preocupar.
- Resolver o nome da entidade afetada (ex.: nome da comunidade em vez de "Comunidade #28").
- Busca sem acento em detalhes (`unaccent`).
