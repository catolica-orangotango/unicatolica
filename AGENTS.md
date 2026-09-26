<!-- bmad:context -->
<!-- Verified 2026-09-24 against d58cec8. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## UniCatólica (PACEXT)

Rede social acadêmica do Campus Joinville da CatólicaSC — projeto de PAC Extensionista. Monólito multimodular: backend Java 21 + Quarkus 3.33 + Hibernate/Panache (pacote por módulo), frontend Angular ^22 SPA, Postgres via Neon. Implementação em andamento no corte must-have da semana 1: Identidade (cadastro, confirmação de e-mail, login, logout) e Comunidades (auto-join, criar, entrar/sair, listar) já têm código; Publicações começa agora (spec 3.2 em `_bmad-output/implementation-artifacts/`); os demais 9 módulos são só `package-info.java`. Comece por `docs/como-funciona.md` (fluxo de requisição, estrutura, onde colocar código novo); índice em `docs/README.md`. Arquitetura mantida em `docs/arquitetura.md` (AD-1 a AD-11; o spine em `_bmad-output/` é snapshot histórico); requisitos em `docs/produto/contexto-pacext.md` e `docs/produto/prd.md`; épicos/histórias em `_bmad-output/planning-artifacts/epics.md`. Reestruturação em andamento — ver `docs/decisoes/2026-09-24-reestruturacao.md`; código novo segue a estrutura alvo descrita em `como-funciona.md`.

## Policy

- Nunca implementar um endpoint novo (front ou back) sem `openapi.yaml` acordado primeiro entre os dois lados — contrato é fonte de verdade (AD-4).
- Nunca importar nada de fora da raiz de outro módulo — só as interfaces, records e eventos públicos da raiz, ex.: `comunidades.AutoJoinCursoService`, `identidade.UsuarioCadastrado` (AD-3). Dado de outro módulo é referenciado só pelo id (`Long`), sem FK nem relação JPA; nome/curso de usuário vêm de `identidade.UsuarioConsulta.buscarResumos(ids)`. `identidade` não importa nenhum outro módulo (avisa os outros por evento CDI, ex.: `UsuarioCadastrado`), e o transversal (`compartilhado/`) não importa nenhum módulo. Verificado por `ArquiteturaTest` no CI; violações antigas ficam em `EXCECOES_TEMPORARIAS` com o PR que as remove — nunca adicionar uma nova.
- Nunca escrever direto em `log_auditoria` — sempre injetar `compartilhado.auditoria.AuditoriaService` (AD-11).
- Nunca commitar segredos/config — só variáveis de ambiente (Render env vars / `.env` local, modelo em `.env.example`).
- `main` é protegida: sem push direto, nem para admin. Fluxo: branch → PR → os 3 checks do CI verdes → squash merge. Sem revisão humana obrigatória (AD-8, decisão do time).

## Where things are

- Backend: `backend/src/main/java/br/edu/unicatolica/pacext/<modulo>/`. Todo módulo segue o layout de `identidade/` e `comunidades/`: raiz só com a API pública (interfaces, records, eventos), `web/` (`*Resource`, `*Request`/`*Response`), `aplicacao/` (`*Service`, implementações da raiz, observers), `dominio/` (entidade, `*Repository`, exceções que estendem `ApiException`).
- Transversal do backend: `compartilhado/` — `seguranca/` (`JwtSecurityFilter`, `SessaoInvalidadaFilter`, `UsuarioAutenticado`), `erro/` (`ApiException`, todos os mappers, `ErroResponse`, `RespostasErro` para os filtros), `paginacao/` (`PageResponse`), `auditoria/`, `email/`.
- Migrations: `backend/src/main/resources/db/changelog/modulos/<modulo>/<modulo>-NNN-descricao.xml`, incluídas pelo `db.changelog-master.xml` (não editar o mestre por PR). Exceção: a pasta `modulos/infraestrutura/` (log_auditoria) mantém o nome antigo — renomear muda o caminho que o Liquibase grava e quebra o banco de produção.
- Frontend: `frontend/src/app/` — `core/` (auth service/guard, serviços HTTP por módulo, `config/api.config.ts`), `features/<modulo>/<tela>/`, `layout/` (`shell`, `auth-shell`), `ui/` (design system, exportado por `ui/index.ts`). E2E em `frontend/e2e/`.
- Tokens de design (Campus Clean): `frontend/src/styles/` — ver `frontend/src/styles/README.md`.
- Documentação viva: `docs/` (índice `docs/README.md`; decisões novas em `docs/decisoes/`). Histórico de planejamento/implementação (só leitura): `_bmad-output/` — specs de story em `_bmad-output/implementation-artifacts/`.
- Contrato REST: `openapi.yaml` na raiz.

## Running and verifying

- Setup uma vez: `./scripts/dev-setup.sh` (cria `.env`, gera chaves JWT, liga `backend/.env` → `../.env`). Com `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` vazios no `.env` o Quarkus dev não sobe (`mp.jwt.verify.publickey` vazio).
- Dia a dia no host (Docker rodando, JDK 21, Node 24 via `.nvmrc`): `cd backend && ./mvnw quarkus:dev` (8080, debug 5005, health `/q/health`) e `cd frontend && npm start` (4200). Postgres vem do Quarkus Dev Services — a `jdbc.url` só é fixa em `%prod`; banco externo em dev só via `QUARKUS_DATASOURCE_JDBC_URL`.
- Tudo em container: `docker-compose up` (Postgres 16 em 5432 + Quarkus + Angular). `target/`, `node_modules/` e `.angular/` do compose ficam em volumes próprios — não misturar com os do host.
- Backend: `cd backend && ./mvnw test` (Dev Services sobe o Postgres; precisa só do Docker). Testes em `backend/src/test/java/...` espelham os pacotes, com `@QuarkusTest` + rest-assured.
- Frontend: `cd frontend && npx ng test --watch=false` (Vitest) e `npx ng build`. E2E: `npm run e2e` (Playwright; sobe o `ng serve` sozinho, backend mockado via `page.route()`; teste com Quarkus real só com `E2E_BACKEND=1`; pré-requisito `npx playwright install chromium`).
- Contrato: `npx --yes @redocly/cli lint openapi.yaml`.
- CI (`.github/workflows/ci.yml`) roda exatamente esses 3 jobs: Frontend, Backend, Contrato. Ainda não há validação em runtime da resposta contra o schema do `openapi.yaml` (prevista na AD-4).

## Conventions that differ from defaults

- Nomes de entidade/tabela/coluna em português (linguagem ubíqua do domínio); classes técnicas (`Resource`/`Service`/`Repository`) e paths REST em inglês.
- Campos JSON de request/response em camelCase português (`nomeCompleto`, não `name`) — sem camada de tradução.
- IDs são `bigint`/identity do Postgres, nunca UUID.
- `Instant` só para timestamps (ISO-8601 UTC); campos só-data usam `LocalDate`, nunca `Instant`.
- Erros seguem envelope fixo `{"error": {"code","message","details"}}` com status HTTP por cenário (401/403/404/400/422/409/500) — 403 vs. 404 decide se a existência do recurso deve ficar oculta (AD-5). Não montar `ErroResponse` à mão nem criar mapper por módulo: lançar `ApiException` (fábricas `validacao`/`naoAutenticado`/`semPermissao`/`naoEncontrado`/`conflito`) ou uma subclasse dela e deixar o `ApiExceptionMapper` traduzir. Filtros, que não podem lançar, usam `RespostasErro`.
- Toda listagem pagina com o componente compartilhado `PageResponse` do `openapi.yaml` (e `compartilhado.paginacao.PageResponse` no backend) — nenhum endpoint inventa a própria forma.
- JWT só via header `Authorization: Bearer` — nunca cookie (front guarda o token em `localStorage`). Claims fixos `sub` + `roles`; allowlist de endpoints públicos só no `JwtSecurityFilter`; CORS só em `quarkus.http.cors`.
- Changelog Liquibase: um arquivo por módulo, changeset id prefixado pelo nome do módulo (ex.: `comunidades-002-...`), nunca contador global (AD-9).
- Cada módulo do backend documenta em `package-info.java` seus RFs, tabelas próprias e interface publicada — manter atualizado ao mexer no módulo.
- Frontend: SCSS nunca hardcoda hex/px/fonte/raio — só `var(--uc-*)` e classes `.uc-text-*`; `scss-guard.spec.ts` quebra o build.
- Frontend segue WCAG 2.2 nível AA (RNF06) — não verificado automaticamente em CI.

<!-- /bmad:context -->
