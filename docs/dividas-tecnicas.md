# Dívidas técnicas

Problemas conhecidos que ainda não têm história nem PR. Quando um item virar história, anote o número dela em **Estado**. Quando for resolvido, remova o item da tabela e cite o PR na mensagem de commit.

| # | Dívida | Estado |
|---|---|---|
| DT-1 | Cadastro sem campo de confirmação de senha | Aberta |
| DT-2 | Cadastro sem validação de senha segura | Aberta |
| DT-3 | Lista de cursos ainda não é mantida pelo administrador | KAN-44 |
| DT-4 | E-mail de confirmação do cadastro não chega ao usuário | Código pronto; falta configurar a Brevo no Render |
| DT-5 | Nome de comunidade sem limite de tamanho no backend | Aberta |

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

## DT-3. Lista de cursos ainda não é mantida pelo administrador

- **Hoje:** desde a decisão de 2026-09-30, o curso é a entidade `Curso` do módulo Identidade (migration `identidade-005`). O cadastro usa um `select` carregado de `GET /cursos`, público, e grava `usuario.curso_id`. Falta:
  - **Cadastro de cursos:** a lista são os 26 cursos do seed, e ninguém cadastra, renomeia nem desativa curso, porque o papel ADMINISTRADOR ainda não existe no backend.
  - **Coluna antiga:** `usuario.curso` (texto) continua gravada com o nome oficial do curso, para quem só lê o nome (`UsuarioResumo`, Home, auto-join) não mudar. Renomear um curso deixaria essa cópia desatualizada.
  - **Vínculo com a comunidade:** o auto-join ainda casa curso e comunidade pelo nome, não pelo id.
- **Correção esperada (KAN-44):**
  - Papel ADMINISTRADOR e `POST`/`PUT /cursos`.
  - Evento `CursoCadastrado`, que cria a comunidade de curso (Story 2.1).
  - Vínculo curso → comunidade pelo id.
  - Remoção da coluna `usuario.curso`.

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
