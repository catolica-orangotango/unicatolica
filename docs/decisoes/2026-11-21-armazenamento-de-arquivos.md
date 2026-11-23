# Armazenamento de arquivos: bucket S3-compatível privado, envio pelo backend

- **Data:** 2026-11-21
- **Estado:** aceita; falta o responsável pelo deploy escolher o provedor e executar o checklist
- **Tickets:** KAN-128 (feature: anexo de postagem e foto de perfil), KAN-129 (tarefa de deploy), KAN-103 (primeiro deploy)
- **Arquitetura:** AD-3 (módulo `midia`), AD-6 (hosting); AD-1 a AD-11 sem alteração
- **Relacionadas:** [`2026-11-16-planejamento-de-deploy.md`](2026-11-16-planejamento-de-deploy.md), [`variaveis-de-ambiente.md`](../variaveis-de-ambiente.md) (seção 6), [DT-15](../dividas-tecnicas.md#dt-15-mídia-limitações-conhecidas-do-mvp), [design](../superpowers/specs/2026-11-21-midia-design.md)

## Contexto

A postagem passa a aceitar um arquivo (PDF, PNG ou JPEG) e o perfil ganha foto. O disco do Render é efêmero (ver "Consequências" do planejamento de deploy), então os bytes precisam de armazenamento externo.

## Decisão

1. **Armazenamento de objetos S3-compatível**, falado pelo AWS SDK (Quarkus Amazon S3). O código não depende de provedor: trocar de provedor é só configuração.
2. **Envio pelo backend** (`POST /arquivos`, multipart): o backend valida o tipo pelos primeiros bytes e o tamanho (PDF 5 MB, imagem 2 MB) antes de gravar. O navegador nunca recebe credencial do bucket.
3. **Bucket privado, leitura por URL assinada** de 10 minutos, gerada pelo backend só para quem pode ver a postagem (ou a foto). Sem acesso público e sem CORS no bucket, porque o navegador só baixa pela URL assinada.
4. **Provedor: de quem cuida do deploy.** Cloudflare R2, Backblaze B2, AWS S3 e MinIO funcionam sem mudar código. Sugestão: R2 (S3-compatível, plano gratuito, sem custo de saída).
5. **Dev e testes:** o Quarkus Dev Services sobe um LocalStack com o bucket `pacext-midia`; nenhuma variável é necessária.
6. **Produção exige as cinco variáveis**; sem elas o backend não sobe (falha cedo, em vez de falhar no primeiro upload).

## Variáveis (nomes finais)

| Variável | Segredo | Uso |
|---|---|---|
| `ARMAZENAMENTO_ENDPOINT` | não | URL S3 do provedor (R2: `https://<conta>.r2.cloudflarestorage.com`) |
| `ARMAZENAMENTO_REGIAO` | não | Região (R2: `auto`) |
| `ARMAZENAMENTO_BUCKET` | não | Nome do bucket |
| `ARMAZENAMENTO_ACCESS_KEY` | **sim** | Chave de acesso |
| `ARMAZENAMENTO_SECRET_KEY` | **sim** | Chave secreta |
| `QUARKUS_S3_PATH_STYLE_ACCESS` | não | Opcional: `true` só se o provedor exigir endereço path-style (MinIO) |

As cinco primeiras já estão declaradas no `render.yaml` com `sync: false` (valor digitado no painel, nunca no repositório).

## Checklist para quem faz o deploy (KAN-129)

Na ordem. O item 4 vem **antes do merge** do PR da feature (KAN-128): o `render.yaml` passa a pedir as variáveis e a produção não sobe sem elas.

1. Escolher o provedor e criar a conta (sugestão: R2).
2. Criar um bucket **PRIVADO**: sem acesso público (no R2, sem domínio público nem `r2.dev`) e **sem CORS**.
3. Criar um token de API **restrito a esse bucket**, com leitura e escrita (sem permissão de administrador da conta). Anotar endpoint, região, nome do bucket, access key e secret key.
4. Cadastrar as cinco variáveis no painel do Render (serviço `pacext-unicatolica-api`), **antes de dar merge**. Access key e secret key são segredos: não mandar em grupo, commit ou ticket. Só adicionar `QUARKUS_S3_PATH_STYLE_ACCESS=true` se o provedor pedir path-style.
5. Dar o merge e esperar o `/q/health` ficar verde.
6. Teste de fumaça em produção:
   - enviar um PNG como anexo de uma postagem e abrir a URL assinada (a imagem aparece);
   - esperar cerca de 10 minutos e abrir a mesma URL de novo: deve falhar (expirada);
   - conferir que o feed da comunidade mostra o anexo (um PDF aparece com ícone e nome);
   - definir uma foto de perfil e conferir que aparece no perfil e no card da postagem;
   - conferir que o objeto não abre sem assinatura (URL do objeto sem os parâmetros deve negar).
7. Registrar o provedor escolhido aqui e atualizar o estado desta decisão.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Disco do Render | Efêmero: perde os arquivos a cada deploy. |
| Arquivo no Postgres (`bytea`) | Infla o banco do plano gratuito do Neon e o backup; sem URL assinada nativa. |
| Upload direto do navegador ao bucket (URL pré-assinada de PUT) | Exigiria CORS no bucket e validar o tipo só depois do envio; o envio pelo backend valida antes de gravar. |
| Bucket público | Qualquer pessoa com a URL leria; quebraria a regra de que só quem vê a postagem vê o anexo (e a ocultação pela moderação). |

## Consequências

- Em dev e no CI, `quarkus:dev`, `./mvnw test` e o job "E2E backend" sobem LocalStack e precisam do Docker (imagem de cerca de 400 MB no primeiro pull).
- **`docker-compose up` não suporta upload:** ele desliga o Dev Services e não configura S3, então `POST /arquivos` responde 500 nesse modo. Escolhido documentar em vez de adicionar um MinIO ao compose; quem precisar usa `quarkus:dev` no host. Revisitar se o compose virar o caminho principal de dev.
- Cliente que não envia `Expect: 100-continue` pode ver a conexão cair em corpo acima de 6 MB (limite global do corpo HTTP); o front valida o tamanho antes de enviar.
- O upload ao S3 acontece dentro da transação do banco em `ArquivoService`: troca consciente por simplicidade; pode deixar objeto órfão se o banco falhar depois.
- A foto de perfil ainda não aparece na barra superior nem no avatar da Home, porque `/usuarios/me` não devolve `fotoUrl`; autores de enquetes e moderação também não têm foto.
- Lacunas e plano de correção na [DT-15](../dividas-tecnicas.md#dt-15-mídia-limitações-conhecidas-do-mvp).
