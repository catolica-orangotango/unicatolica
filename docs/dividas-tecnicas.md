# Dívidas técnicas

Problemas conhecidos que ainda não têm história nem PR. Quando um item virar história, anote o número dela em **Estado**. Quando for resolvido, remova o item da tabela e cite o PR na mensagem de commit.

| # | Dívida | Estado |
|---|---|---|
| DT-1 | Cadastro sem campo de confirmação de senha | Aberta |
| DT-2 | Cadastro sem validação de senha segura | Aberta |
| DT-3 | Curso é texto livre, não uma lista mantida pelo administrador | Aberta |
| DT-4 | E-mail de confirmação do cadastro não chega ao usuário | Aberta |

## DT-1. Cadastro sem campo de confirmação de senha

- **Hoje:** o formulário (`frontend/src/app/features/identidade/cadastro/`) tem um único campo `senha`. Um erro de digitação passa despercebido e o usuário não consegue entrar depois.
- **Correção esperada:** campo "Confirmar senha" com um validador de grupo no `FormGroup`, mais uma mensagem de erro acessível (`aria-describedby`, igual aos outros campos). É só no frontend: o `CadastroRequest` não recebe a confirmação.

## DT-2. Cadastro sem validação de senha segura

- **Backend:** `CadastroService.validarPoliticaSenha` exige só 8 caracteres (`identidade.senha.tamanho-minimo`), com ao menos uma letra e um dígito. O próprio código marca a regra como `[DECISÃO A CONFIRMAR]`, porque o RF04 não define a política.
- **Frontend:** o campo só tem `Validators.required`. O usuário não vê os requisitos e só descobre a regra pelo erro `SENHA_POLITICA_INVALIDA` depois de enviar.
- **Correção esperada:**
  1. O time decide a política (tamanho, maiúscula, símbolo, lista de senhas comuns) em `docs/decisoes/`.
  2. O backend aplica essa política.
  3. O frontend mostra os requisitos e valida antes de enviar, com a mesma regra.

## DT-3. Curso é texto livre, não uma lista mantida pelo administrador

- **Hoje:** `curso` é uma `String` digitada livremente (`CadastroRequest`, coluna `usuario.curso`). O auto-join (`comunidades.aplicacao.AutoJoinCursoServiceImpl`) procura a comunidade do tipo `CURSO` pelo nome, sem diferenciar maiúsculas. Se o texto não bater com uma das 26 comunidades de curso criadas pelo seed (`comunidades-002-seed-comunidades-curso.xml`), o cadastro passa, mas o aluno fica sem comunidade. O sistema só registra um `WARN` no log.
- **Correção esperada:**
  - Cadastro de cursos pelo administrador (ligado à Story 2.1, pré-criação de comunidade de curso).
  - Endpoint público que lista os cursos.
  - `select` no cadastro.
  - `usuario.curso` passa a guardar o id do curso.
  - Migração Liquibase dos valores de texto existentes.
- **Atenção:** a mudança atravessa `identidade` e `comunidades`. Pelas regras do `ArquiteturaTest`, `identidade` não pode importar `comunidades`, então o dono do cadastro de cursos precisa ser decidido antes (em `identidade`, em `comunidades` ou em `compartilhado`).

## DT-4. E-mail de confirmação do cadastro não chega ao usuário

- **Hoje:** o `CadastroService` chama `EmailService.enviarConfirmacaoCadastro`, mas não há SMTP configurado.
  - Em dev e teste, o Quarkus usa uma caixa de e-mail simulada: a mensagem só aparece no log do `quarkus:dev`.
  - Em produção, não existe `quarkus.mailer.host` nem credencial no `.env.example`.
  - Sem o e-mail, o usuário não recebe o link `/confirmar-email?token=...` e não consegue fazer o primeiro login.
- **Correção esperada:**
  1. Escolher um provedor SMTP (conta institucional ou serviço transacional).
  2. Configurar `%prod.quarkus.mailer.*` via variáveis de ambiente e documentar essas variáveis no `.env.example`.
  3. Decidir o que acontece se o envio falhar: hoje o envio é síncrono, dentro da transação do cadastro.
  4. Tirar a menção a "ver deferred-work.md" do `application.properties`.
