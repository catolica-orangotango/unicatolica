# Planejamento de deploy: Render + Neon, do merge em `main` à produção

- **Data:** 2026-11-16
- **Estado:** proposta (aguarda o ok do time)
- **Ticket:** KAN-98 (Epic 15: Entrega)
- **Arquitetura:** executa a AD-6 (hosting), a AD-8 (CI/CD) e a AD-10 (operação mínima); AD-1 a AD-11 sem alteração
- **Relacionadas:** [DT-4](../dividas-tecnicas.md#dt-4-e-mail-de-confirmação-do-cadastro-não-chega-ao-usuário) (e-mail), [DT-6](../dividas-tecnicas.md#dt-6-produção-sem-administrador-e-checklist-do-primeiro-deploy) (primeiro administrador), [`variaveis-de-ambiente.md`](../variaveis-de-ambiente.md)

## Contexto

A arquitetura já decidiu **onde** o sistema roda: Angular como Render Static Site, Quarkus como Render Web Service via Docker, Postgres no Neon, deploy automático a cada merge em `main` (AD-6 e AD-8). O que ainda não existe é o **como**: hoje nada disso está no repositório nem configurado.

| Peça | Estado hoje | Falta |
|---|---|---|
| Imagem do backend | O `pom.xml` empacota o Quarkus, mas não há `Dockerfile` | `backend/Dockerfile` |
| Configuração de produção do backend | `%prod` tem URL do banco, contexto Liquibase `prod`, log em JSON e CORS por variável | `sslmode` do Neon na URL, porta vinda de `PORT`, limite de memória da JVM |
| URL da API no frontend | `API_BASE_URL` fixo em `http://localhost:8080` (`core/config/api.config.ts`) | Configuração por ambiente no build |
| Rotas do Angular em produção | Nenhuma regra de reescrita | `/*` para `/index.html` no Static Site, senão recarregar `/admin/usuarios` dá 404 |
| Infraestrutura como código | Não há `render.yaml` | Blueprint na raiz |
| CI | 5 jobs, nenhum faz deploy (certo: o deploy é da integração do Render) | Garantir que o Render só publique com CI verde |
| Primeiro administrador | Seed só no contexto `dev` | Procedimento da DT-6 |
| E-mail de confirmação | Código pronto | Conta Brevo e variáveis no Render (DT-4) |
| Contas | Não está registrado quem tem conta no Render, no Neon e na Brevo | Confirmar com o time |

## Decisão

1. **Um ambiente só: produção.** Sem staging, como já aceito na AD-10. Para não estrear migrations direto em produção, o primeiro deploy é ensaiado contra um **branch do Neon** descartável (a conferir se o plano gratuito permite) ou, no mínimo, contra o Postgres 16 do `docker-compose` com a imagem de produção.
2. **Backend: `backend/Dockerfile` em dois estágios.** Build com JDK 21 (`./mvnw package`), execução com JRE 21 e o `quarkus-app` copiado. Memória da JVM limitada (o plano gratuito do Render tem 512 MB). `quarkus.http.port=${PORT:8080}`. Health check do Render em `/q/health` (AD-10).
3. **Frontend: URL da API por ambiente.** `API_BASE_URL` deixa de ser constante e passa a vir de configuração de build (`fileReplacements` do Angular ou um `environment`). O build de produção aponta para a URL pública do backend. Publicação do diretório `frontend/dist/frontend/browser` com a regra de reescrita `/*` para `/index.html`.
4. **`render.yaml` na raiz.** Os dois serviços descritos no repositório, com os segredos como `sync: false` (valor digitado no painel, nunca no arquivo). Auto-deploy **somente depois dos checks do GitHub passarem**, para um merge com CI vermelho não publicar.
5. **Neon.** URL JDBC com `?sslmode=require`. Usar o endpoint **direto** (sem `-pooler`) no backend, porque o Liquibase migra na subida e usa lock e DDL, que se dão mal com pool de transação (a conferir na documentação do Neon). A extensão `pg_trgm`, criada pela `infraestrutura-002` (KAN-90), exige que o usuário da aplicação seja o dono do banco: conferir no primeiro deploy.
6. **Segredos e variáveis.** A lista completa está em [`variaveis-de-ambiente.md`](../variaveis-de-ambiente.md). Em produção: par JWT **novo**, `CORS_ORIGINS` e `FRONTEND_URL` com a URL do Static Site, `EMAIL_TRANSPORTE=brevo-api` com `BREVO_API_KEY` e `MAIL_FROM`. **Nunca** definir `QUARKUS_LIQUIBASE_CONTEXTS` no Render: a variável vence o `application.properties` e, com `dev`, o seed com senha pública rodaria em produção.
7. **Migrations.** Rodam na subida do backend (`migrate-at-start`). Se uma migration falhar, a instância nova não fica saudável e o Render mantém a anterior no ar. Liquibase não desfaz sozinho, então toda migration passa a ser **aditiva** (coluna nova, tabela nova, índice novo); remover ou renomear vira dois deploys (expandir, depois contrair).
8. **Ordem entre backend e frontend.** Os dois publicam no mesmo merge, então existe uma janela curta de versões misturadas. A regra do contrato (AD-4) já cobre: mudança aditiva no `openapi.yaml`; quebra de contrato exige dois deploys.
9. **Rollback.** Aplicação: o "Rollback" do Render volta ao deploy anterior (backend e frontend separados). Banco: não há rollback automático; vale a regra aditiva do item 7 e a recuperação do Neon (janela do plano gratuito a conferir). Nunca alterar o schema de produção à mão (AD-9).
10. **Observabilidade e partida a frio.** Health check, logs JSON no painel do Render (AD-10). O Render gratuito hiberna após 15 min sem tráfego e leva cerca de 1 min para acordar; o Neon também escala a zero. Para uma demonstração ao vivo, abrir o sistema alguns minutos antes. Manter a instância acordada com um ping externo é possível, mas fica como decisão separada.

```mermaid
flowchart LR
    pr["PR com a chave KAN-n"] --> ci["GitHub Actions<br/>5 jobs"]
    ci -->|"verde"| merge["squash merge em main"]
    merge --> render["Render: auto-deploy<br/>após os checks"]
    render --> be["Web Service (Docker)<br/>/q/health saudável?"]
    render --> fe["Static Site Angular<br/>rewrite /* → /index.html"]
    be -->|"migrate-at-start"| neon[("Neon Postgres<br/>sslmode=require")]
    be -.->|"falhou"| anterior["Render mantém<br/>o deploy anterior"]
    fe -->|"HTTPS, CORS, Bearer"| be
```

## Checklist do primeiro deploy

Na ordem. Os itens com DT são os da [DT-6](../dividas-tecnicas.md#dt-6-produção-sem-administrador-e-checklist-do-primeiro-deploy) e da [DT-4](../dividas-tecnicas.md#dt-4-e-mail-de-confirmação-do-cadastro-não-chega-ao-usuário).

1. Neon: criar o banco de produção e o branch de ensaio; anotar host direto, usuário e senha (só no painel do Render).
2. Gerar um par JWT novo para produção (`scripts/dev-setup.sh` gera o de dev; não reaproveitar).
3. Brevo: conta, remetente verificado, `BREVO_API_KEY` (DT-4).
4. Render: aplicar o `render.yaml` e preencher os segredos. **Sem** `QUARKUS_LIQUIBASE_CONTEXTS` (DT-6).
5. Esperar o `/q/health` ficar verde; conferir nos logs que o Liquibase rodou os changesets e que a extensão `pg_trgm` foi criada.
6. `SELECT email FROM usuario WHERE email LIKE '%.teste@%'` deve voltar vazio (DT-6, item 2).
7. Cadastrar o responsável pela tela normal, confirmar o e-mail e promovê-lo a `ADMINISTRADOR` no console do Neon (DT-6, item 3). Conferir que o e-mail de confirmação chegou e não caiu no spam (DT-4).
8. Roteiro de fumaça em produção: login, `/admin`, criar comunidade, publicar, recarregar uma rota profunda (testa o rewrite) e abrir `/admin/auditoria`.
9. Registrar as URLs finais em `docs/variaveis-de-ambiente.md` e remover DT-4 e DT-6 da tabela de dívidas.

## Ensaio no Neon (17/11/2026)

O backend foi ensaiado contra um branch descartável do Neon (`ensaio`, criado a partir de `production` e já apagado), com o jar `prod` e sem alterar `application.properties`.

| Verificação | Resultado |
|---|---|
| `/q/health` | `UP`, incluindo a conexão com o banco |
| Liquibase | 25 changesets aplicados; `pg_trgm` criada (o usuário do projeto Neon basta, item 5 da decisão confirmado) |
| `GET /cursos` e `POST /auth/registro` | leitura e escrita funcionando; linha conferida com `psql` |
| Seeds de dev | ausentes: nenhum `*.teste@`, login `admin.teste` dá 401 (DT-6) |

Como repetir, sem commitar nada:

1. Conectar a CLI: `npm i -g neon@latest` e login no navegador (`neon branches list --project-id <id>` testa o acesso).
2. Criar o branch de ensaio: `neon branches create --project-id <id> --name ensaio`. Pegar a connection string **direta** (sem `-pooler`): `neon connection-string ensaio --project-id <id>`.
3. Converter `postgresql://usuario:senha@host/banco` em três variáveis, porque o JDBC não aceita usuário e senha na URL:
   `QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://host/banco?sslmode=require`, `DB_USER` e `DB_PASSWORD`.
4. `cd backend && ./mvnw package -DskipTests` e `java -jar target/quarkus-app/quarkus-run.jar` com essas variáveis (mais `CORS_ORIGINS`, `FRONTEND_URL`, JWT). **Não** definir `QUARKUS_LIQUIBASE_CONTEXTS` e **não** usar `quarkus:dev`, que roda os seeds de dev.
5. Conferir `/q/health`, `GET /cursos`, um cadastro e `select count(*) from databasechangelog`.
6. Apagar o branch: `neon branches delete ensaio --project-id <id>`.

Cuidados:

- `neon init` cria `neon.ts`, `package.json` e `node_modules/` na raiz e grava `DATABASE_URL*` no `.env`. Esses arquivos não são do projeto e não devem ser commitados; remover as variáveis do `.env` ao apagar o branch.
- A produção real usa o branch `production`. O backend lê a URL pelas variáveis do Render, não pelo `.env`.
- O serviço de object-storage do Neon fica fora: Materiais não está no escopo deste plano (ver Consequências).

## Primeiro deploy no Render (18/11/2026)

Blueprint aplicado a partir do `main` (serviços `pacext-unicatolica-api` e `pacext-unicatolica-web`). A API subiu com Liquibase aplicado, `/q/health` em `UP`, cadastro com e-mail de confirmação pela Brevo e login funcionando. Quatro falhas apareceram pelo caminho; cada uma tem causa e correção abaixo.

| Sintoma | Causa | Correção |
|---|---|---|
| `Driver does not support the provided URL` | `QUARKUS_DATASOURCE_JDBC_URL` recebeu a connection string do Neon (`postgresql://usuario:senha@...`). O JDBC não aceita usuário e senha na URL. | Separar em três variáveis: `jdbc:postgresql://<host-direto>/<banco>?sslmode=require`, `DB_USER` e `DB_PASSWORD`. Host sem `-pooler` e sem `channel_binding`. |
| `Acquisition timeout while waiting for new connection` | O padrão de 5 s do pool não cobre o Render gratuito (pouca CPU, TLS) com o Neon acordando do repouso. | `%prod.quarkus.datasource.jdbc.acquisition-timeout=30S` no `application.properties` (PR #84). |
| E-mail de confirmação não chegava: Brevo `HTTP 401` ("unrecognised IP address") e depois `HTTP 400` (remetente inválido) | A Brevo bloqueia chamadas de API de IPs não autorizados, e o IP de saída do Render gratuito não é fixo. O `MAIL_FROM` era um Gmail não verificado. | Em *Security → Authorised IPs*, desativar o bloqueio para chaves de API. `MAIL_FROM` com um remetente verificado na Brevo. |
| Login funcionava e a home redirecionava para o login (`SRJWT07004: Failed to load a key from the key content`) | `JWT_PUBLIC_KEY` ilegível para o Quarkus. | Gerar o par novo e colar cada chave em uma linha, sem `BEGIN`/`END`, como o `scripts/dev-setup.sh` (privada com cerca de 1600 caracteres, pública com cerca de 390). |

### Pendências que a entrega ao cliente exige

- **Domínio próprio na Brevo** (registros DKIM, SPF e DMARC no DNS) e `MAIL_FROM` nesse domínio. O remetente atual é um endereço individual: o e-mail chega, mas pode cair no spam, e o bloqueio por IP precisa ficar desligado enquanto o IP de saída não for fixo.
- **Rotação de segredos que vazaram em transcrições e logs** durante o primeiro deploy (senha do banco e chave da Brevo): trocar no Neon e na Brevo e atualizar as variáveis no Render. Segredo nunca é colado em chat nem em log.
- Roteiro de fumaça em produção, primeiro administrador e fechamento de DT-4 e DT-6 (KAN-103, KAN-104).

## Tickets sugeridos

| Ordem | Ticket | Depende de |
|---|---|---|
| 1 | `backend/Dockerfile`, `PORT`, `sslmode`, limite de memória, teste local da imagem contra o Postgres do compose | nada |
| 2 | `API_BASE_URL` por ambiente no frontend (e2e continua usando `localhost:8080`) | nada |
| 3 | `render.yaml` com os dois serviços, health check, rewrite e auto-deploy após os checks | 1 e 2 |
| 4 | Contas e segredos (Neon, Brevo, Render) e primeiro deploy pelo checklist acima | 3 |
| 5 | Roteiro de fumaça em produção e fechamento das DT-4 e DT-6 | 4 |

Os itens 1 e 2 são independentes e podem andar em paralelo.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Build nativo (GraalVM) do Quarkus | Build longo e pesado em memória, sem ganho necessário agora; a partida a frio do Render gratuito é dominada pelo acordar da instância. |
| Deploy por GitHub Actions com *deploy hook* | Daria controle total sobre "só publica com os 5 jobs verdes", mas duplica o que a integração nativa faz. Fica como plano B se "auto-deploy após os checks" não bastar. |
| Postgres do próprio Render | Expira em 30 dias (AD-6). |
| Frontend e backend no mesmo serviço (Quarkus servindo o Angular) | Quebra a AD-6 e o CORS centralizado, e acopla o deploy dos dois. |
| Staging completo | Custo e tempo fora do prazo (AD-10); o ensaio em branch do Neon cobre o risco principal, as migrations. |

## Consequências

- O repositório passa a conter a infraestrutura (`Dockerfile`, `render.yaml`), versionada e revisada como o resto do código.
- Toda migration nova precisa ser aditiva; regra a incluir no checklist de PR.
- A produção depende de segredos fora do repositório: quem perder acesso ao painel do Render ou do Neon perde a capacidade de trocá-los. Definir pelo menos duas pessoas com acesso.
- Continuam abertos, e não resolvidos aqui: backup e recuperação do Neon além do padrão do plano gratuito, armazenamento de arquivos para Materiais (disco do Render é efêmero) e ping contra a hibernação.

## Perguntas para o time

1. Quem tem conta (e acesso de administrador) no Render, no Neon e na Brevo? Há mais de uma pessoa em cada?
   *Parcial (17/11):* Luis tem conta na Brevo. Render: a confirmar. Neon: Luis opera o projeto pela CLI (ver [Ensaio no Neon](#ensaio-no-neon-17112026)), falta saber se é administrador e se há mais alguém. Como conferir: Render em *Workspace Settings → Members* (papel Owner/Admin); Neon em *Settings → Members*.
2. O Render e o Neon já têm algum serviço ou banco criado? Se sim, com quais nomes e URLs?
   *Neon (17/11):* existe o projeto `blue-cloud-71865208` (org `org-spring-cell-61391370`) com o branch `production`, vazio até o ensaio. Render: a confirmar.
3. Qual é a data da demonstração ou da entrega? Ela define se vale o ping contra a hibernação.
4. Quem será o primeiro administrador de produção (DT-6) e qual e-mail institucional ele usa?
