# Modelo — Epic 2: Comunidades (KAN-12)

Modelo técnico para as 6 histórias do Epic 2 (KAN-21 a KAN-26), com base nos critérios de
aceite do `epics.md` (RF21–RF31) e na lista real de cursos da instituição. Cobre o que já
existe (Story 2.3), o que falta, e as dependências cruzadas com o módulo Identidade
(agora de responsabilidade do Vynicyus).

## Decisão de modelagem: uma comunidade por curso (não por curso+modalidade)

RF21.2 diz "pré-criar a comunidade de **cada curso**" — não menciona modalidade. Decisão:
**26 comunidades de curso**, uma por curso; a modalidade (EaD/Semipresencial/Presencial)
fica como **atributo do perfil do aluno**, não como um recorte de comunidade separado.
Motivo prático: dobraria o número de comunidades a manter (42 vs. 26) sem que nenhum
critério de aceite do Epic 2 peça esse recorte — se o time decidir mais pra frente que
faz sentido separar por modalidade, é uma migração aditiva (não quebra o que foi
construído aqui).

## O que já existe (Story 2.3 e a fundação do módulo)

- Tabelas `comunidade` (`id`, `nome`, `descricao`, `tipo` CURSO/ABERTA, `criado_por_usuario_id`,
  `criado_em`, `atualizado_em`) e `comunidade_membro` (`comunidade_id`, `usuario_id`,
  `papel_na_comunidade` ADMINISTRADOR/MEMBRO, `entrou_em`) — já criadas
  (`comunidades-001-create-comunidade.xml`)
- `ComunidadeRepository`, `ComunidadeMembroRepository` — leitura e checagem de associação
- `AutoJoinCursoService` (Story 2.3) — casa o texto de `usuario.curso` contra
  `comunidade.nome` (tipo=CURSO), idempotente, já testado

**O que falta pra 2.3 ter efeito de verdade:** hoje ele só loga aviso porque nenhuma
comunidade de curso existe ainda — é exatamente o que a Story 2.1 resolve (seed dos 26
cursos).

## Os 26 cursos (fonte: lista fornecida, um por comunidade)

```
1.  Administração
2.  Análise e Desenvolvimento de Sistemas (ADS)
3.  Arquitetura e Urbanismo
4.  Biomedicina
5.  Ciência da Computação
6.  Ciências Contábeis
7.  Ciências Econômicas
8.  Design
9.  Direito
10. Educação Física
11. Enfermagem
12. Engenharia Civil
13. Engenharia de Produção
14. Engenharia de Software
15. Fisioterapia
16. Gestão da Produção Industrial
17. Gestão da Tecnologia da Informação
18. Gestão de Recursos Humanos
19. Gestão Financeira
20. Logística
21. Nutrição
22. Pedagogia
23. Processos Gerenciais
24. Psicologia
25. Serviço Social
26. Teologia
```

`[DECISÃO A CONFIRMAR]` **Casamento com `usuario.curso`**: o auto-join (2.3) compara texto
digitado no cadastro contra `comunidade.nome`. Com 26 nomes fixos agora conhecidos, o
cadastro (tela nossa, Story 1.2) deveria virar um **dropdown com esses 26 valores** em vez
de campo livre — evita erro de digitação silenciosamente quebrar o auto-join (o mesmo
risco já registrado em `modelo-dados-semana-1.md`). É mudança só no frontend do Cadastro
(nosso), não toca Identidade.

## ⚠️ Dependência cruzada com Identidade (precisa do Vynicyus)

1. **Papel `ADMINISTRADOR` não existe** — hoje `usuario.perfil` só aceita `ALUNO`/`MODERADOR`
   (Story 2.1 exige distinguir administrador da plataforma, RF21.2).
2. **Campo `modalidade` no cadastro** — você pediu que o aluno selecione a modalidade de
   ensino no cadastro. Isso é um campo novo em `usuario` (Identidade), não em `comunidade`
   — like `curso`, mas não afeta o auto-join. Precisa de uma migration nova
   (`identidade-004-...`) e um campo a mais no formulário de cadastro.
3. **Redirecionamento pós-cadastro** (ambiente do curso ou Home com notícias das
   modalidades seguidas) — isso é comportamento de **Home/Feed**, que é do Epic 3
   (Publicações) e Epic 14 (Design System/navegação), não do Epic 2. Documentado aqui só
   como contexto; não faz parte do modelo de Comunidades em si.

Nenhum desses 3 pontos bloqueia começar 2.1/2.2 — só a *seed* de comunidades de curso e o
dropdown do cadastro dependem deles indiretamente (item 1 bloqueia só o endpoint de criar
comunidade de curso via API; a seed via migration não precisa do papel existir).

## Modelo por história

### Story 2.1 — Pré-criação de comunidade de curso (KAN-21)

- **Seed imediato (não depende do papel ADMINISTRADOR):** novo changeset
  `comunidades-002-seed-comunidades-curso.xml` — insere as 26 linhas em `comunidade`
  (`tipo='CURSO'`), com `criado_por_usuario_id` apontando a um valor reservado (`0`,
  documentado como "sistema/seed", já que nenhum usuário administrador existe ainda).
  Isso já destrava o auto-join (2.3) de verdade.
- **Endpoint (depende do papel ADMINISTRADOR existir em Identidade):**
  `POST /comunidades` com `tipo=CURSO` — só aceita se `usuarioAutenticado.possuiPerfil("ADMINISTRADOR")`,
  senão 403 (RF21.2). Serve para cursos novos que a instituição abrir depois do go-live.
- Critério de validação de campo obrigatório (RF22) reaproveitado pela 2.2 também.

### Story 2.2 — Criação de comunidade aberta (KAN-22)

- `POST /comunidades` com `tipo=ABERTA` — qualquer `ALUNO` autenticado.
- Ao criar, insere automaticamente uma linha em `comunidade_membro` com
  `papel_na_comunidade='ADMINISTRADOR'` pro criador (RF23) — mesmo padrão que
  `AutoJoinCursoServiceImpl` já usa pra inserir `MEMBRO`.
- Mesma validação de campos obrigatórios (RF22) da 2.1.

### Story 2.3 — Auto-join (KAN-23) — ✅ pronta

Sem mudança de código — só passa a ter efeito real assim que a seed da 2.1 rodar.

### Story 2.4 — Ingresso e saída de comunidade aberta (KAN-24)

- `POST /comunidades/{id}/membros` — só pra `tipo=ABERTA` (RF24); 409 se já for membro
  (RF25, mesma constraint única que já existe no banco).
- `DELETE /comunidades/{id}/membros/me` — remove a própria associação (RF26).

### Story 2.5 — Listagem, filtro, visualização não-membro (KAN-25)

- `GET /comunidades?tipo=&nome=` — paginado (`PageResponse`, AD-4), filtro por tipo/nome (RF27, RF28).
- `GET /comunidades/{id}` — inclui `souMembro: boolean` na resposta, pra o frontend decidir
  se mostra a caixa de postar ou o aviso de não-membro (RF27.1, UX-DR19). O bloqueio de
  fato em postar/comentar/votar só existe quando o Epic 3 (Publicações) tiver o endpoint de
  criar postagem — aqui só preparamos o dado que a interface vai precisar.

### Story 2.6 — Administração de comunidade (KAN-26)

- `DELETE /comunidades/{id}/membros/{usuarioId}` — só quem é `ADMINISTRADOR` daquela
  comunidade (RF29).
- `PATCH /comunidades/{id}` — edita `nome`/`descricao`; `tipo` nunca aceito no corpo (RF30,
  imutabilidade).
- `DELETE /comunidades/{id}` — **exclusão lógica**, não física (RF31 diz "deixa de aparecer
  nas listagens", não "apaga os dados") — precisa de coluna nova `ativa BOOLEAN DEFAULT true`
  via migration (`comunidades-003-...`); listagens (2.5) passam a filtrar `ativa=true`.

Decisões da implementação:

- "Administrador" aqui é o papel `ADMINISTRADOR` **dentro da comunidade** (`comunidade_membro`),
  não o da plataforma — por isso a 2.6 não depende da 2.1.
- Administrador não pode ser removido pelo `DELETE .../membros/{usuarioId}` (nem a si mesmo):
  422 `ADMIN_NAO_PODE_SER_REMOVIDO`, para a comunidade não ficar sem administrador. Para
  encerrá-la, o administrador a exclui. (O `DELETE .../membros/me` da 2.4 ainda deixa o único
  administrador sair; fica como pendência.)
- Comunidade excluída é inexistente para todos: `buscarAtivaPorId` (404 nas rotas de
  Comunidades), `ComunidadeConsulta.existe`/`ehMembro` (Publicações responde 404 ao postar ou
  listar o feed), `/comunidades/minhas` e o auto-join de curso.
- O nome de uma comunidade excluída continua reservado (`nome` é `unique`): criar outra com o
  mesmo nome devolve 409.

## Ordem de implementação sugerida

```
1. comunidades-002 (seed dos 26 cursos)         — já destrava 2.3 de verdade
2. Story 2.2 (comunidade aberta)                 — sem bloqueio, pode começar já
3. Story 2.4 (entrar/sair)                       — depende só da 2.2
4. Story 2.5 (listar/filtrar/visualizar)         — depende de 2.1 (seed) + 2.2
5. Story 2.1 endpoint (admin cria curso novo)    — depende do papel ADMINISTRADOR (Vynicyus)
6. Story 2.6 (administrar)                       — depende de 2.2, mais a coluna ativa
```

## Itens a alinhar com o Vynicyus antes de fechar tudo

1. Adicionar `ADMINISTRADOR` como valor válido de `usuario.perfil`
2. Adicionar campo `modalidade` em `usuario` (novo, não estava em nenhum RF original —
   veio do seu pedido agora) + campo correspondente no formulário de cadastro
