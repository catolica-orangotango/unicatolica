# Dívidas técnicas

Problemas conhecidos que ainda não têm história nem PR. Quando um item virar história, anote o número dela em **Estado**. Quando for resolvido, remova o item da tabela e cite o PR na mensagem de commit.

| # | Dívida | Estado |
|---|---|---|
| DT-4 | E-mail de confirmação do cadastro não chega ao usuário | Código pronto; falta configurar a Brevo no Render |
| DT-5 | Nome de comunidade sem limite de tamanho no backend | Aberta |

## DT-4. E-mail de confirmação do cadastro não chega ao usuário

- **Hoje:** o código está pronto ([decisão de 01/10](decisoes/2026-10-01-envio-de-email.md)). O transporte é escolhido por `EMAIL_TRANSPORTE`, a Brevo é o provedor e o envio acontece depois do commit. Em produção ainda não há conta nem variáveis configuradas, então o e-mail continua sem chegar.
- **Correção esperada:**
  1. Criar a conta grátis na Brevo e verificar o remetente padrão `luis98.pereira@catolicasc.edu.br` (ou outro, definido em `MAIL_FROM`).
  2. No Render, definir `EMAIL_TRANSPORTE=brevo-api` e `BREVO_API_KEY`.
  3. Cadastrar um usuário de teste em produção e conferir se o e-mail chega (e se não cai no spam do domínio institucional).

## DT-5. Nome de comunidade sem limite de tamanho no backend

- **Hoje:** a coluna `comunidade.nome` é `varchar(150)`, mas `ComunidadeService.criarComunidadeAberta` só valida que o nome foi informado, e o `ComunidadeRequest` do `openapi.yaml` não tem `maxLength`. Nome com mais de 150 caracteres estoura no banco e volta 500, não 422. A tela de criar comunidade (KAN-22) barra no frontend com `maxlength`, mas uma chamada direta à API ainda cai no 500.
- **Correção esperada:**
  1. `maxLength: 150` em `nome` no `ComunidadeRequest` do `openapi.yaml`.
  2. `ComunidadeService` lança `ApiException.validacao` (422) acima de 150, com teste unitário e `@QuarkusTest` pelo HTTP.
  3. O `LIMITE_NOME_COMUNIDADE` do `comunidades.service.ts` continua igual ao do backend.
- **Prazo:** antes de liberar a criação de comunidade em produção para os alunos.

## DT-6. Produção sem administrador e checklist do primeiro deploy

- **Hoje:** o usuário `admin.teste@catolicasc.edu.br` é semeado só no contexto Liquibase `dev` (`identidade-008`). Em produção (`%prod...contexts=prod`) nenhum usuário tem o perfil `ADMINISTRADOR`, então `/admin` fica inalcançável. O Render ainda não foi configurado.
- **Decisão:** o primeiro administrador é promovido à mão, uma única vez, sem código novo. Um changeset ou um bootstrap por variável de ambiente deixaria um caminho permanente de elevação de privilégio ou dependeria da conta já existir na hora da migration.
- **Correção esperada (no primeiro deploy):**
  1. Não definir `QUARKUS_LIQUIBASE_CONTEXTS` no Render. A variável vence o `application.properties` e, com `dev`, o seed com senha pública rodaria em produção.
  2. Depois do primeiro deploy, conferir no banco que não existem `aluno.teste`, `moderador.teste` nem `admin.teste` (`SELECT email FROM usuario WHERE email LIKE '%.teste@%'`). Se existirem, apagar.
  3. A pessoa responsável se cadastra pela tela normal e confirma o e-mail. Depois, no console do Neon: `UPDATE usuario SET perfil = 'ADMINISTRADOR' WHERE email = '<e-mail dela>';`. O perfil vale no próximo login.
  4. Daí em diante, outros perfis passam a ser alterados pela tela de usuários (`/admin/usuarios`, KAN-83). O administrador não altera o próprio perfil, então o primeiro continua sendo promovido à mão.
- **Prazo:** antes de abrir o sistema em produção.
