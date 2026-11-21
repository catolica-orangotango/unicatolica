# Mídia no MVP: anexo em postagem e foto de perfil (design)

Status: **aprovado em 2026-11-21** (provedor a confirmar pelo responsável pelo deploy). Nada foi implementado.

## Intenção

Hoje a postagem é só texto e o avatar é montado com as iniciais. O MVP passa a aceitar **um arquivo (PDF, PNG ou JPG) por postagem** e **foto de perfil** (PNG ou JPG). É o mesmo trabalho do Épico 7 (Stories 7.1 e 7.3), que já estava planejado, mais a foto de perfil. A equipe escolheu armazenamento de objetos S3-compatível.

## Objetivos

- Autor anexa um arquivo ao criar a postagem; quem tem acesso à postagem abre ou baixa.
- Usuário define e remove a própria foto de perfil; ela aparece no card de post e no perfil.
- Troca de provedor de armazenamento só mexendo em variáveis de ambiente.

## Não objetivos

- Vários arquivos por postagem, vídeo, áudio, edição do anexo depois de publicado.
- Link externo com preview (Story 7.2): fica para depois.
- Recorte, redimensionamento ou miniaturas de imagem.
- Varredura de vírus.

## Anti-objetivos

- Arquivo servido por URL pública permanente: um link vazado daria acesso ao material para sempre.
- Tipo de arquivo confiado só pela extensão ou pelo `Content-Type` enviado pelo cliente.
- Segredo do bucket em código, em `render.yaml` ou no front.

## Restrições do projeto

- Contrato primeiro: `openapi.yaml` acordado antes de qualquer endpoint (AD-4).
- Módulo novo `midia` com layout `web/aplicacao/dominio`; outros módulos só chamam a interface pública da raiz e guardam o id como `Long`, sem FK (AD-3). `ArquiteturaTest` precisa passar.
- Erros por `ApiException`; ids `bigint`; timestamps `Instant`.
- Migration em `db/changelog/modulos/midia/midia-001-...xml`.
- Front: só tokens `var(--uc-*)`, acessibilidade AA, teste novo no axe.
- Testes entregues junto (Service, Resource, tela).
- Render gratuito tem disco efêmero, por isso nada de arquivo local em produção.

## Abordagens consideradas

| Abordagem | Resultado |
|---|---|
| A. Bytes no Postgres (Neon), tabela com `bytea` | Mais simples, sem serviço novo. Limitada pelo espaço do Neon e sem caminho para vídeo. Rejeitada pela equipe. |
| **B. Armazenamento de objetos S3-compatível** | **Escolhida pela equipe.** Escala e não pesa no banco. Custa conta, credenciais e mais configuração de deploy. |
| C. Só links externos | Não é upload e não resolve foto de perfil. Descartada. |

Dentro da B, três decisões minhas (a equipe não as tomou; corrijam se discordarem):

1. **Provedor: a confirmar pelo responsável pelo deploy.** Qualquer um com API S3-compatível serve (Cloudflare R2, Backblaze B2, AWS S3, MinIO); o código fala só S3 e o provedor entra por variáveis. Sugestão: Cloudflare R2 (10 GB gratuitos, sem custo de saída). Requisitos: bucket **privado** e credenciais restritas a esse bucket. Se o escolhido exigir endereço path-style, entra uma variável extra, avisada na lista final.
2. **Upload passa pelo backend** (multipart para o Quarkus, que grava no bucket). Alternativa descartada: URL de upload assinada direto do navegador, que exige CORS no bucket e mais estado no front.
3. **Bucket privado, leitura por URL assinada de curta duração.** O backend confere se o usuário tem acesso e devolve a URL, que expira em minutos. Alternativa descartada: bucket público.

## Design

**Módulo `midia`.** A raiz expõe uma interface (por exemplo `MidiaService`) para outros módulos validarem e resolverem um `arquivoId`. Tabela `arquivo`: `id`, `chave` (caminho no bucket), `tipoConteudo`, `tamanhoBytes`, `nomeOriginal`, `donoId` (Long), `criadoEm`.

**Fluxo.**
1. `POST /files` (multipart, autenticado) valida, grava no bucket e devolve `{id, nome, tipo, tamanho}`.
2. A postagem (`POST` de publicação) e o perfil passam a aceitar `arquivoId` opcional. Só o dono do arquivo pode associá-lo, e um arquivo só serve a um uso.
3. Respostas de postagem e perfil trazem o objeto do arquivo com `url` assinada.
4. Quem tem acesso à postagem recebe a URL; foto de perfil é visível a qualquer usuário autenticado.

**Validação (decisões minhas).** PDF até 5 MB, imagem até 2 MB, foto de perfil só imagem. O tipo é conferido pelos primeiros bytes do arquivo (assinatura), não pelo que o cliente declara. Formato inválido ou arquivo grande devolve 400 com os formatos aceitos (RF50). Os limites ficam em configuração.

**Moderação.** Postagem ocultada pela moderação deixa de entregar a URL do anexo.

**Arquivo órfão.** Arquivo enviado e nunca associado fica no bucket. Aceito no MVP e registrado em `docs/dividas-tecnicas.md`; limpeza periódica depois.

**Front.** Botão de anexar no compositor de postagem (já previsto no mockup), card de post com ícone + nome (PDF) ou imagem, e envio de foto na tela de perfil. Iniciais continuam como fallback sem foto.

## Infraestrutura (o que o dev de deploy recebe)

Nomes **provisórios**; a lista final sai quando a implementação terminar, junto com a atualização de `render.yaml`, `.env.example` e `docs/variaveis-de-ambiente.md`.

| Variável | Segredo | Uso |
|---|---|---|
| `ARMAZENAMENTO_ENDPOINT` | não | URL S3 do provedor (no R2: `https://<conta>.r2.cloudflarestorage.com`) |
| `ARMAZENAMENTO_REGIAO` | não | Região (no R2: `auto`) |
| `ARMAZENAMENTO_BUCKET` | não | Nome do bucket |
| `ARMAZENAMENTO_ACCESS_KEY` | **sim** | Chave de acesso |
| `ARMAZENAMENTO_SECRET_KEY` | **sim** | Chave secreta |

A fazer fora do código: criar o bucket **privado**, gerar token com permissão apenas de leitura e escrita nesse bucket e cadastrar as variáveis no painel do Render antes do merge. Sem CORS no bucket. Em dev e nos testes, um emulador S3 local (Dev Services do Quarkus) evita precisar de credenciais reais.

## Deixado para quem for construir

Biblioteca S3 (extensão Quarkus Amazon S3 é a candidata), formato da chave no bucket, tempo exato de expiração da URL, nomes finais das variáveis e como detectar o tipo pelo conteúdo.

## Perguntas em aberto

- Qual provedor S3 o responsável pelo deploy escolhe? (Não bloqueia o código.)
- Foto de perfil com limites próprios? Assumi imagem até 2 MB.
