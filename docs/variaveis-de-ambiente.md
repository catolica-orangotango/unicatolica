# Variáveis de ambiente

O que cada variável do `.env` precisa ter para rodar o projeto localmente e em produção. Fontes: [`.env.example`](../.env.example) e [`application.properties`](../backend/src/main/resources/application.properties). Ao adicionar ou mudar uma variável, atualize os três.

## Jeito rápido

```bash
./scripts/dev-setup.sh
```

O script copia o `.env.example` para `.env`, gera as chaves JWT e liga `backend/.env` ao `.env` da raiz. Depois disso o projeto já sobe com `./mvnw quarkus:dev` e `npm start`. Só é preciso mexer no `.env` para enviar e-mail de verdade.

> **Segurança:** o `.env` nunca é commitado (está no `.gitignore`). Chaves JWT e chaves de e-mail são segredos: não mande no grupo, em commit ou em ticket. Em produção, os valores vão nas **Environment Variables do Render**, nunca em arquivo.

**Situação** nas tabelas:

- **Obrigatória:** o backend não sobe sem ela.
- **Tem padrão:** já vem preenchida e funciona como está.
- **Opcional:** só serve para um recurso específico.

## 1. Banco de dados (Postgres)

Em dev no host, o Quarkus Dev Services sobe um Postgres sozinho (precisa do Docker rodando) e ignora `DB_HOST`, `DB_PORT` e `DB_NAME`. Essas variáveis valem para o docker-compose e para produção.

| Variável | Situação | Valor para rodar local | O que é / produção |
|---|---|---|---|
| `DB_HOST` | Tem padrão | `localhost` | Host do Postgres. Só usado em produção (Neon). |
| `DB_PORT` | Tem padrão | `5432` | Porta do Postgres. No compose, é a porta exposta no host. |
| `DB_NAME` | Tem padrão | `pacext` | Nome do banco. |
| `DB_USER` | Tem padrão | `pacext` | Usuário do banco. Produção: usuário do Neon. |
| `DB_PASSWORD` | Tem padrão | `pacext` | Senha do banco. Produção: senha do Neon (segredo). |

## 2. Segurança (JWT)

Sem as duas chaves preenchidas o `quarkus:dev` não sobe (`mp.jwt.verify.publickey` vazio). O `dev-setup.sh` gera o par uma vez; cada pessoa tem o seu.

| Variável | Situação | Valor para rodar local | O que é / produção |
|---|---|---|---|
| `JWT_PRIVATE_KEY` | **Obrigatória** | Gerada pelo `dev-setup.sh` | Chave RSA privada que assina o token de sessão, em base64 numa linha só, sem BEGIN/END. Segredo. Produção: par próprio, só no Render. |
| `JWT_PUBLIC_KEY` | **Obrigatória** | Gerada pelo `dev-setup.sh` | Chave pública do mesmo par, que valida o token. Mesmo formato da privada. |
| `JWT_ISSUER` | Tem padrão | `https://pacext.unicatolica.edu.br` | Emissor esperado no token. Não precisa mudar. |
| `SESSAO_INATIVIDADE_MINUTOS` | Tem padrão | `15` | Minutos sem atividade até a sessão expirar e a tela voltar para o login. É a validade de cada token, renovado por `POST /auth/refresh` enquanto o usuário está ativo. Ver [decisão de 05/10](decisoes/2026-10-05-validade-da-sessao.md). |

Para gerar as chaves à mão, sem o `dev-setup.sh`:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out /tmp/private.pem
openssl rsa -pubout -in /tmp/private.pem -out /tmp/public.pem
awk '/BEGIN/{next} /END/{next} {printf "%s", $0}' /tmp/private.pem  # JWT_PRIVATE_KEY
awk '/BEGIN/{next} /END/{next} {printf "%s", $0}' /tmp/public.pem   # JWT_PUBLIC_KEY
```

## 3. Frontend e CORS

Para o Angular em `http://localhost:4200` conversar com o backend em `http://localhost:8080`.

| Variável | Situação | Valor para rodar local | O que é / produção |
|---|---|---|---|
| `CORS_ORIGINS` | Tem padrão | `http://localhost:4200` | Origem que o backend aceita. Produção: URL do frontend publicado. |
| `FRONTEND_URL` | Tem padrão | `http://localhost:4200` | Não está no `.env.example`. Base do link de confirmação enviado por e-mail. Produção: URL do frontend publicado, senão o link do e-mail aponta para localhost. |
| `API_URL` | Tem padrão | `http://localhost:8080` | Reservada. Nenhuma tela lê ainda; o front usa `core/config/api.config.ts`. |

## 4. E-mail de confirmação do cadastro

Sem nada configurado, o e-mail vai para a mailbox mock e aparece no log do `quarkus:dev`. O cadastro funciona e dá para pegar o link no log. Para enviar de verdade, escolha a opção A ou a B. Decisão em [`decisoes/2026-10-01-envio-de-email.md`](decisoes/2026-10-01-envio-de-email.md).

| Variável | Situação | Valor para rodar local | O que é / produção |
|---|---|---|---|
| `EMAIL_TRANSPORTE` | Tem padrão | `smtp` (mock em dev) | `brevo-api` (opção A) ou `smtp` (opção B). Produção no Render free: `brevo-api`, porque o Render bloqueia SMTP de saída. |
| `MAIL_FROM` | Tem padrão | `luis98.pereira@catolicasc.edu.br` | Remetente. Precisa estar verificado no provedor (Brevo: Senders). |
| `MAIL_FROM_NOME` | Tem padrão | `UniCatólica` | Nome que aparece como remetente. |

**Opção A: API da Brevo**

| Variável | Situação | Valor para rodar local | O que é / produção |
|---|---|---|---|
| `BREVO_API_KEY` | Opcional (obrigatória com `brevo-api`) | Chave da Brevo: SMTP & API → API Keys | Segredo. Com `brevo-api`, envia de verdade mesmo em dev, sem passar pela mock. |

**Opção B: SMTP**

| Variável | Situação | Valor para rodar local | O que é / produção |
|---|---|---|---|
| `QUARKUS_MAILER_HOST` | Opcional | `smtp-relay.brevo.com` | Servidor SMTP do provedor. |
| `QUARKUS_MAILER_PORT` | Opcional | `587` | Porta SMTP. |
| `QUARKUS_MAILER_START_TLS` | Opcional | `REQUIRED` | TLS na conexão SMTP. |
| `QUARKUS_MAILER_USERNAME` | Opcional | Login SMTP do provedor | Brevo: SMTP & API → SMTP. |
| `QUARKUS_MAILER_PASSWORD` | Opcional | Chave SMTP do provedor | Segredo. |
| `QUARKUS_MAILER_MOCK` | Opcional | `false` | Em dev o SMTP usa a mock mesmo com host definido; `false` desliga a mock para enviar de verdade. |

Exemplo mínimo para enviar e-mail de verdade em dev:

```bash
# ... variáveis geradas pelo dev-setup.sh (banco, JWT, CORS) ...
EMAIL_TRANSPORTE=brevo-api
BREVO_API_KEY=<sua chave da Brevo>
MAIL_FROM=<remetente verificado na Brevo>
MAIL_FROM_NOME=UniCatólica
```

> Comentário com `#` só em linha própria: o Quarkus não remove comentário no fim da linha, e ele vira parte do valor.

## 5. Regras do cadastro (opcionais)

Não estão no `.env.example`.

| Variável | Situação | Valor para rodar local | O que é / produção |
|---|---|---|---|
| `EMAIL_DOMINIO_INSTITUCIONAL` | Tem padrão | `catolicasc.edu.br` | Domínio de e-mail aceito no cadastro. |
| `SENHA_TAMANHO_MINIMO` | Tem padrão | `8` | Tamanho mínimo da senha. |
| `CONFIRMACAO_TOKEN_VALIDADE_HORAS` | Tem padrão | `24` | Validade do link de confirmação, em horas. |
