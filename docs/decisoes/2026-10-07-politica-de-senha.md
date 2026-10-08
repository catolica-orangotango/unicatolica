# Política de senha: 8+ caracteres, maiúscula, número e caractere especial

- **Data:** 07/10/2026
- **Resolve:** a [DT-2](../dividas-tecnicas.md#dt-2-cadastro-sem-validação-de-senha-segura)

## Contexto

O RF04 não define a política de senha. Até aqui `CadastroService.validarPoliticaSenha` só
exigia 8 caracteres com letra e dígito, marcado `[DECISÃO A CONFIRMAR]` no código, e o
frontend não mostrava nenhum requisito — o usuário só descobria a regra pelo erro
`SENHA_POLITICA_INVALIDA` depois de enviar o formulário (KAN-50).

## Decisão

A senha precisa ter, ao mesmo tempo:

1. Mínimo de 8 caracteres.
2. Pelo menos uma letra maiúscula.
3. Pelo menos um número.
4. Pelo menos um caractere especial (qualquer caractere fora de `A-Za-z0-9`).

Aplicada nos dois lados com a mesma regra:

- **Backend:** `CadastroService.validarPoliticaSenha` (tamanho mínimo continua configurável
  por `identidade.senha.tamanho-minimo`/`SENHA_TAMANHO_MINIMO`, padrão 8).
- **Frontend:** `senhaForteValidator` no campo `senha` do formulário de cadastro, que também
  alimenta o checklist exibido abaixo dos campos de senha (um item por regra, atualizado a
  cada tecla, sem esperar o campo perder o foco).

Não é exigida letra minúscula nem lista de senhas comuns — fora de escopo desta decisão.
