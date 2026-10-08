# Camada de tokens de design (Story 14.1) e camada base (Story 14.7)

Esta pasta e a **fonte unica** de valores de design do frontend: paleta, escala
tipografica, espacamento, raio e a sombra de overlay. Tudo vem, verbatim, do
`DESIGN.md` do UX ("Campus Clean"):
`_bmad-output/planning-artifacts/ux-designs/ux-unicatolica-2026-08-17/DESIGN.md`.

## Arquivos

| Arquivo            | Papel                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `_tokens.scss`     | Bloco `:root` unico. Todas as custom properties `--uc-*`. Fonte da verdade.                                       |
| `_typography.scss` | Classes utilitarias `.uc-text-*`, uma por papel de tipografia. Compoem so `var(--uc-*)`.                          |
| `_base.scss`       | Camada base global (Story 14.7): reset, pintura do `body`, `font: inherit` em controles e anel de foco unico.     |
| `../styles.scss`   | Unico entry point de build. Agrega os parciais via `@use` (tokens -> typography -> base, nessa ordem).            |
| `tokens.spec.ts`   | Compila `styles.scss` com `sass` e trava os tokens, a tabela deste README e as classes `.uc-text-*` contra drift. |
| `base.spec.ts`     | Compila `styles.scss` e trava o contrato da camada base (regra `body`, reset, anel de foco, zero hex fora do `:root`). |
| `scss-guard.spec.ts` | Guard "nada hardcoded" sobre **todas** as folhas de `src/app/**` e `src/styles/*` (Story 14.7).                  |

## Regra: consuma via `var(--uc-*)`, nunca hardcode

Componentes e telas em `frontend/src/app/**` **nunca** escrevem um hex, px, peso
de fonte, espacamento de letra, familia de fonte ou raio literal. Eles leem o
token. Isso nao e convencao: `scss-guard.spec.ts` le cada folha de estilo e
falha nomeando arquivo, linha e declaracao.

```scss
.card {
  background: var(--uc-color-surface);
  border: 1px solid var(--uc-color-border);
  border-radius: var(--uc-radius-md);
  padding: var(--uc-space-card-padding);
}
```

```html
<h1 class="uc-text-greeting">Ola, Julia</h1>
<p class="uc-text-body">Corpo de postagem, texto corrido.</p>
```

### Valor ausente do `DESIGN.md` = "Ask First"

Se uma story consumidora (14.2, 14.7, ...) precisa de um valor que o `DESIGN.md`
nao define (focus ring, scrim de overlay, estado desabilitado), isso e uma
escalada **"Ask First"** na story consumidora, nao um literal silencioso. Nenhum
token novo entra aqui sem passar pelo `DESIGN.md`.

## `.uc-text-*` vs classe de componente

- Use `.uc-text-*` para um papel de tipografia puro em um template
  (`<span class="uc-text-meta">ha 2 h</span>`).
- A Story 14.2 introduz os componentes standalone `<uc-badge>`,
  `button[uc-button]`, `<uc-member-indicator>` e `<uc-card>` em `src/app/ui/`,
  cujo SCSS compoe os mesmos tokens. Para um componente, use o componente
  `uc-*`, nao a utilitaria de tipografia. O `button[uc-button]` nao sobrescreve
  o `type` nativo: em uma acao que nao deve enviar um formulario ao redor, o
  consumidor precisa passar `type="button"` explicitamente.
- A Story 14.7 migrou as telas ja existentes (Login, Cadastro, Verifique seu
  e-mail) do SCSS por componente com valores hardcoded para consumo de token, e
  deu as tres a casca comum `<uc-auth-shell>`
  (`src/app/layout/auth-shell/`): landmark `<main>`, marca e card centralizado.

## Camada base (`_base.scss`, Story 14.7)

E a unica camada autorizada a estilizar seletor de elemento. Carrega:

- reset `box-sizing: border-box` em tudo e `margin: 0` em `html, body`;
- pintura do canvas: `body` com `--uc-color-bg`, `--uc-color-ink`,
  `--uc-font-family-base`, `--uc-font-size-body` e `--uc-line-height-body`;
- `font: inherit` em `button, input, select, textarea` (controle de formulario
  nao herda a fonte do documento sozinho);
- **um** anel de foco global, `2px solid var(--uc-color-maroon)` com
  `outline-offset: 2px`, igual ao de `ui/button/button.scss`.

Duas regras inegociaveis, ambas travadas por teste:

1. **Nenhum bloco `:root` e nenhuma custom property `--uc-*` aqui.**
   `_tokens.scss` e o unico ponto de declaracao; `tokens.spec.ts` extrai o
   primeiro `:root` compilado e compara o conjunto de tokens exatamente, entao
   um token declarado aqui escaparia do guard.
2. **Nenhum valor de design literal.** So sobram literais estruturais
   (`border-box`, `0`, o contorno de 2px). `base.spec.ts` verifica a regra
   `body` declaracao por declaracao e que nao existe hex fora do `:root`.

Ordem de `@use` em `styles.scss`: `tokens` -> `typography` -> `base`. A base
consome os tokens, entao entra por ultimo.

## Guard "nada hardcoded" (`scss-guard.spec.ts`, Story 14.7)

Sucede o guard da Story 14.2 (`src/app/ui/ui-styles.spec.ts`, deletado) e vale
para **toda** folha de `src/app/**` mais `src/styles/*`. Reprova hex, literal de
tamanho em propriedade de dimensao, cor/fonte fora de token e referencia a um
`--uc-*` que `_tokens.scss` nao declara.

Duas valvulas, ambas explicitas:

- um gradiente cujas paradas de cor sao todas `var(--uc-*)` e um `background`
  valido (a geometria pode ser literal, a cor nao);
- uma declaracao fica isenta quando a propria linha, ou a linha imediatamente
  acima, traz `// layout-literal: <motivo>` **com motivo nao vazio**. E para as
  dimensoes estruturais que o `DESIGN.md` escreve com "~" e defere (sidebar de
  220px, coluna de leitura de 720px, `minmax()` de grade). Motivo vazio nao
  isenta nada.

## Modo escuro

Fora de escopo do MVP (decisao confirmada no `DESIGN.md`). Nao ha bloco
`@media (prefers-color-scheme)` nem token dark. Nao adicione um sem renegociar.

## Nota sobre a pilha de fontes

O `DESIGN.md` marca a pilha de fontes de sistema como **pendencia do time**:
nenhuma tipografia de marca (Google Font ou similar) foi avaliada. A pilha atual
e uma escolha pragmatica; uma fonte de exibicao propria mais adiante e uma
revisao explicita do `DESIGN.md`, nao um bloqueio para esta camada.

As classes `.uc-text-*` **nao** aplicam `font-family` (nenhum papel do
`DESIGN.md` define uma). A pilha de sistema vale para o documento inteiro desde
a Story 14.7, aplicada uma unica vez no `body` por `_base.scss`; texto marcado
com `.uc-text-*` herda dali.

## Tabela de tokens

Nome -> valor -> papel no `DESIGN.md`. Esta tabela e verificada contra
`_tokens.scss` compilado por `tokens.spec.ts` (linha fora de sincronia = teste
vermelho).

### Paleta (`colors`)

| Token                    | Valor     | Papel                                                                                                                    |
| ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `--uc-color-bg`          | `#FAFAF8` | `colors.bg` - canvas base, quase branco                                                                                  |
| `--uc-color-surface`     | `#FFFFFF` | `colors.surface` - superficie de card                                                                                    |
| `--uc-color-border`      | `#EAEAE6` | `colors.border` - divisoria / contorno de card (1px)                                                                     |
| `--uc-color-ink`         | `#1C1C1A` | `colors.ink` - texto de conteudo principal                                                                               |
| `--uc-color-ink-soft`    | `#6B6B66` | `colors.ink-soft` - texto secundario (metadados, timestamps)                                                             |
| `--uc-color-ink-faint`   | `#6E6E68` | `colors.ink-faint` - texto terciario (labels, placeholders)                                                              |
| `--uc-color-maroon`      | `#7A1F2B` | `colors.maroon` - acento institucional minimo (traco, icone ativo, titulo de comunidade de curso); nunca fundo dominante |
| `--uc-color-orange`      | `#BC4913` | `colors.orange` - unico acento de acao forte (CTA primario, tag de destaque)                                             |
| `--uc-color-orange-tint` | `#FDEEE6` | `colors.orange-tint` - fundo suave de badge / nav ativa; nunca texto                                                     |
| `--uc-color-green-ok`    | `#3A7D5C` | `colors.green-ok` - unico token de sucesso (membro, confirmacao positiva)                                                |
| `--uc-color-error`       | `#B3261E` | `colors.error` - texto de erro (validacao inline, falha de login/cadastro); aviso e borda + texto, nunca bloco preenchido |

### Tipografia (`typography`)

| Token                            | Valor                                                                         | Papel                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `--uc-font-family-base`          | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif` | pilha de sistema, todos os papeis (pendencia do time - ver acima)         |
| `--uc-font-size-greeting`        | `22px`                                                                        | `typography.greeting` - saudacao no topo do Inicio                        |
| `--uc-font-size-question`        | `15px`                                                                        | `typography.question` - perguntas de enquete, titulos de card             |
| `--uc-font-size-body`            | `13.5px`                                                                      | `typography.body` - corpo de postagem, texto corrido                      |
| `--uc-font-size-meta`            | `12px`                                                                        | `typography.meta` - timestamps, contagens, texto secundario               |
| `--uc-font-size-label-caps`      | `10.5px`                                                                      | `typography.label-caps` - labels em caixa alta, nomes de secao            |
| `--uc-font-weight-regular`       | `400`                                                                         | peso regular (`body`, `meta`)                                             |
| `--uc-font-weight-semibold`      | `600`                                                                         | peso de enfase (`greeting`, `question`)                                   |
| `--uc-font-weight-caps`          | `700`                                                                         | peso reservado a `label-caps`                                             |
| `--uc-line-height-body`          | `1.5`                                                                         | `typography.body.lineHeight` (unico papel com line-height no `DESIGN.md`) |
| `--uc-letter-spacing-greeting`   | `-0.01em`                                                                     | `typography.greeting.letterSpacing`                                       |
| `--uc-letter-spacing-label-caps` | `0.05em`                                                                      | `typography.label-caps.letterSpacing`                                     |

### Espacamento (`spacing`)

| Token                     | Valor  | Papel                                                                                      |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| `--uc-space-unit`         | `4px`  | `spacing.unit` - unidade base; componha com `calc()`                                       |
| `--uc-space-card-padding` | `18px` | `spacing.card-padding` - padding interno padrao de card (fora do grid de 4px, intencional) |
| `--uc-space-section-gap`  | `20px` | `spacing.section-gap` - separacao entre blocos verticais                                   |
| `--uc-space-page-margin`  | `32px` | `spacing.page-margin` - enquadramento do conteudo                                          |

Nao ha ramp numerico `--uc-space-{n}`: o `DESIGN.md` nao define um. Um consumidor
que precise de um pede via "Ask First".

### Raio (`rounded`)

| Token                 | Valor    | Papel                                                                                 |
| --------------------- | -------- | ------------------------------------------------------------------------------------- |
| `--uc-radius-sm`      | `6px`    | `rounded.sm` - chips e controles pequenos                                             |
| `--uc-radius-default` | `8px`    | `rounded.DEFAULT` - cards e inputs                                                    |
| `--uc-radius-md`      | `12px`   | `rounded.md` - cards e inputs (card generico da 14.2)                                 |
| `--uc-radius-lg`      | `14px`   | `rounded.lg` - container externo de um bloco de app                                   |
| `--uc-radius-full`    | `9999px` | `rounded.full` - pill: badges de comunidade e botoes de acao; nunca cards de conteudo |

### Elevacao

| Token                 | Valor                            | Papel                                                                                   |
| --------------------- | -------------------------------- | --------------------------------------------------------------------------------------- |
| `--uc-shadow-overlay` | `0 8px 24px rgba(0, 0, 0, 0.08)` | `DESIGN.md` prosa "Elevation & Depth" - dropdowns e toasts; valor de partida, ajustavel |

## Verificacao rapida

```bash
cd frontend
npm test          # tokens.spec.ts (tokens + este README + .uc-text-*),
                  # base.spec.ts (camada base) e scss-guard.spec.ts (nada hardcoded)
npm run build     # styles.scss compila sem erro de Sass
```
