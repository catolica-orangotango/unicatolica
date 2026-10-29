# Camada de tokens de design (Story 14.1) e camada base (Story 14.7)

Esta pasta e a **fonte unica** de valores de design do frontend: paleta, escala
tipografica, espacamento, layout, raio e as sombras. Os valores sao os do
frontmatter do [`DESIGN.md`](../../../DESIGN.md) da raiz (sistema do redesign,
aprovado no KAN-84 e implementado no KAN-91; origem e contraste em
[`docs/decisoes/2026-10-24-nova-direcao-visual.md`](../../../docs/decisoes/2026-10-24-nova-direcao-visual.md)).
Mudou um valor aqui, muda o `DESIGN.md` e a tabela abaixo no mesmo PR.

## Arquivos

| Arquivo            | Papel                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `_tokens.scss`     | Bloco `:root` unico. Todas as custom properties `--uc-*`. Fonte da verdade.                                       |
| `_typography.scss` | Classes utilitarias `.uc-text-*`, uma por papel de tipografia. Compoem so `var(--uc-*)`.                          |
| `_base.scss`       | Camada base global (Story 14.7): reset, pintura do `body`, `font: inherit` em controles e anel de foco unico.     |
| `../app/ui/field/_input.scss` | Estilo global do controle de formulario `.uc-input` (KAN-91), aplicado pela diretiva `ucInput`. Incluido por `styles.scss`, depois de `base`. |
| `_breakpoints.scss` | Breakpoints de layout (KAN-91) como variaveis Sass (`$uc-bp-tablet`, `$uc-bp-mobile`), nao `--uc-*` - `@media` nao le custom property. So `@use`d por quem precisa, nao agregado em `styles.scss`. |
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

Se uma tela ou componente precisa de um valor que o `DESIGN.md` nao define
(scrim de overlay, opacidade, duracao de animacao), isso e uma escalada
**"Ask First"** no ticket consumidor, nao um literal silencioso. Nenhum token
novo entra aqui sem entrar no frontmatter do `DESIGN.md` no mesmo PR (foi assim
com os cinco tokens que a KAN-91 acrescentou: `ink-nav`, `ink-disabled`,
`error-border`, `toast-ok` e `toast-error`).

## `.uc-text-*` vs classe de componente

- Use `.uc-text-*` para um papel de tipografia puro em um template
  (`<span class="uc-text-meta">ha 2 h</span>`).
- Para um componente, use o componente `uc-*` de `src/app/ui/` (exportado por
  `ui/index.ts`), nao a utilitaria de tipografia: o SCSS dele ja compoe os
  mesmos tokens. O `button[uc-button]` nao sobrescreve o `type` nativo: em uma
  acao que nao deve enviar um formulario ao redor, o consumidor precisa passar
  `type="button"` explicitamente.
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

## Controle de formulario (`ui/field/_input.scss`, KAN-91)

O `input`, `select` ou `textarea` projetado dentro de `<uc-field>` e conteudo
projetado: a encapsulacao de estilo do Angular nao o alcanca. Por isso a
diretiva `ucInput` poe a classe `uc-input` no elemento e o estilo mora neste
parcial global, que so emite seletores de classe (`.uc-input`,
`.uc-input:is(textarea)`). Estados: repouso (`--uc-color-border-input`,
`--uc-radius-md`, `--uc-touch-target`), foco (borda `--uc-color-maroon` e halo de
3px `--uc-color-maroon-tint`) e erro (`aria-invalid="true"` ou
`.uc-input--erro`: borda `--uc-color-error` e halo `--uc-color-error-tint`). O
halo de 3px e espalhamento estrutural, marcado com `// layout-literal:`. O
`select` mantem a seta nativa do navegador (seta `down` customizada exigiria
`background-image`, que nao aceita cor fora de token).

## Componentes de `src/app/ui/` (KAN-91)

Visual e estados descritos na secao "Components" do `DESIGN.md`; referencia em
`docs/design/kan-84/componentes.html`.

| Componente | Seletor | Variantes e estados |
| ---------- | ------- | ------------------- |
| Icone | `<uc-icon>` | 18 nomes (`UcIconName`), `size` `md` (22px) ou `sm` (18px); sempre `aria-hidden` |
| Avatar | `<uc-avatar>` | `cor` marca, neutro, azul, verde, areia, violeta (`corDoAvatar(id)`); `forma` circulo ou quadrado; `tamanho` sm, md, lg |
| Botao | `button[uc-button]` | `variant` primary, secondary, danger; `size` default (36px) ou large (44px); 44px abaixo de 760px; `disabled` ou `aria-disabled` |
| Badge | `<uc-badge>` | `variant` obrigatoria: counter, role, course, open, state |
| Card | `<uc-card>` | sem inputs; raio xl, borda, sem sombra; so blocos laterais |
| Esqueleto | `<uc-skeleton>` | sem inputs; `aria-hidden`; largura do consumidor |
| Estado vazio | `<uc-empty-state>` | `titulo`, `descricao` opcional, acao por `[acao]` |
| Aviso | `<uc-note>` | `tom` neutro, alerta, erro (`role="alert"` so no erro); `titulo`; acao por `[acao]` |
| Campo | `<uc-field>` + `ucInput` | `label`, `hint`, `error`; repouso, foco, erro, selecao (estilo em `_input.scss`) |
| Menu suspenso | `<uc-menu>` | `itens` (`perigo`, `desabilitado`), `direcao` abaixo ou acima, `[(aberto)]`, `gatilho` |
| Filtro segmentado | `<uc-segmented>` | `opcoes` (com `contador` opcional), `[(valor)]`; radiogroup com setas |
| Indicador de membro | `<uc-member-indicator>` | `estado` nao-membro, entrando, membro, membro-menu, restrito |
| Toast | `<uc-toast-host>` + `ToastService` | `tipo` sucesso ou erro; `acao` opcional; pausa com foco |

## Breakpoints (`_breakpoints.scss`, KAN-91)

| Variavel | Valor | Efeito na casca |
| -------- | ----- | --------------- |
| `$uc-bp-tablet` | 1180px | ate aqui a coluna lateral some (menu + conteudo) |
| `$uc-bp-mobile` | 760px | ate aqui uma coluna, barra superior, barra de abas e gaveta "Suas comunidades"; botoes e campos com `--uc-touch-target` |

Use com `@use '<caminho>/styles/breakpoints' as bp;` e
`@media (max-width: bp.$uc-bp-mobile)`. Nao repita o valor literal em `@media`.

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
  dimensoes estruturais que nao tem token (avatar de 34px, contador de 22px,
  altura maxima de painel, `minmax()` de grade). Motivo vazio nao isenta nada.

## Modo escuro

Fora de escopo do MVP (decisao confirmada no `DESIGN.md`). Nao ha bloco
`@media (prefers-color-scheme)` nem token dark. Nao adicione um sem renegociar.

## Fonte

A familia de fonte e o token `--uc-font-family-base` (Inter, com `system-ui` e
a pilha de sistema como fallback), aplicada uma unica vez no `body` por
`_base.scss`. As classes `.uc-text-*` **nao** aplicam `font-family`: o texto
marcado com elas herda dali.

## Tabela de tokens

Nome -> valor -> papel no `DESIGN.md` (no frontmatter, sem o prefixo `--uc-`). Esta tabela e verificada contra
`_tokens.scss` compilado por `tokens.spec.ts` (linha fora de sincronia = teste
vermelho).

### Paleta (`colors`)

| Token | Valor | Papel |
| --- | --- | --- |
| `--uc-color-bg` | `#FFFFFF` | canvas base (KAN-91: era #FAFAF8) |
| `--uc-color-surface` | `#FFFFFF` | superficie de card, campo, menu |
| `--uc-color-surface-muted` | `#F7F7F8` | hover, avisos, publicacao oculta |
| `--uc-color-surface-strong` | `#F1F1F3` | filtro segmentado, chips, avatar neutro |
| `--uc-color-border` | `#ECECEE` | filete decorativo |
| `--uc-color-border-strong` | `#E2E2E6` | contorno de botao secundario |
| `--uc-color-border-input` | `#8E8E96` | contorno de campo (3:1) |
| `--uc-color-ink` | `#18181B` | texto principal |
| `--uc-color-ink-soft` | `#66666E` | texto secundario (meta, descricao) |
| `--uc-color-ink-faint` | `#707078` | placeholder |
| `--uc-color-ink-nav` | `#3F3F46` | item de menu lateral (adicionado na KAN-91) |
| `--uc-color-ink-disabled` | `#8A8A93` | texto de controle desabilitado, isento do WCAG (KAN-91) |
| `--uc-color-maroon` | `#7A1F2B` | marca, acao primaria, foco |
| `--uc-color-maroon-hover` | `#691A25` | botao primario em hover |
| `--uc-color-maroon-tint` | `#F7ECEE` | badge de papel, dia de hoje, halo do foco |
| `--uc-color-green-ok` | `#2F6141` | sucesso (membro, criada) |
| `--uc-color-green-tint` | `#EAF3EC` | fundo de sucesso |
| `--uc-color-error` | `#B3261E` | erro de campo, botao de perigo |
| `--uc-color-error-tint` | `#FBEAE9` | fundo de aviso de erro |
| `--uc-color-error-border` | `#F0C9C6` | borda de aviso de erro (KAN-91) |
| `--uc-color-warn` | `#8A5A00` | icone de alerta |
| `--uc-color-warn-tint` | `#FDF5E7` | fundo de alerta |
| `--uc-color-toast-ok` | `#B9E4C9` | icone de sucesso em toast escuro (KAN-91) |
| `--uc-color-toast-error` | `#FFB4AB` | icone de erro em toast escuro (KAN-91) |
| `--uc-color-avatar-blue` | `#2B4A72` | iniciais do avatar blue |
| `--uc-color-avatar-green` | `#2F6141` | iniciais do avatar green |
| `--uc-color-avatar-sand` | `#6B4E1F` | iniciais do avatar sand |
| `--uc-color-avatar-violet` | `#4E3A72` | iniciais do avatar violet |
| `--uc-color-avatar-blue-bg` | `#E8EEF6` | fundo do avatar blue |
| `--uc-color-avatar-green-bg` | `#EAF3EC` | fundo do avatar green |
| `--uc-color-avatar-sand-bg` | `#F3EEE6` | fundo do avatar sand |
| `--uc-color-avatar-violet-bg` | `#EFEAF6` | fundo do avatar violet |

### Tipografia (`typography`)

| Token | Valor | Papel |
| --- | --- | --- |
| `--uc-font-family-base` | `Inter, system-ui, -apple-system, 'Segoe UI', sans-serif` | Inter carregada pelo index.html |
| `--uc-font-size-greeting` | `22px` | titulo de tela |
| `--uc-font-size-title-lg` | `24px` | titulo de tela de trabalho |
| `--uc-font-size-title` | `17px` | titulo de secao e cartao |
| `--uc-font-size-body` | `15px` | corpo, texto corrido |
| `--uc-font-size-small` | `14px` | acoes, descricao |
| `--uc-font-size-meta` | `13px` | timestamps, contagens |
| `--uc-font-size-label` | `12px` | badge, legenda |
| `--uc-font-weight-regular` | `400` | peso regular |
| `--uc-font-weight-medium` | `500` | peso medio |
| `--uc-font-weight-semibold` | `600` | peso de enfase |
| `--uc-font-weight-bold` | `700` | titulos, item ativo |
| `--uc-line-height-body` | `1.5` | line-height do corpo |
| `--uc-letter-spacing-greeting` | `-0.02em` | titulo de tela |

### Espacamento (`spacing`)

| Token | Valor | Papel |
| --- | --- | --- |
| `--uc-space-unit` | `4px` | unidade base |
| `--uc-space-1` | `4px` | escala numerica |
| `--uc-space-2` | `8px` | escala numerica |
| `--uc-space-3` | `12px` | escala numerica |
| `--uc-space-4` | `16px` | escala numerica |
| `--uc-space-5` | `20px` | escala numerica |
| `--uc-space-6` | `24px` | escala numerica |
| `--uc-space-7` | `32px` | escala numerica |
| `--uc-space-8` | `40px` | escala numerica |
| `--uc-space-card-padding` | `18px` | padding interno de card |
| `--uc-space-section-gap` | `20px` | separacao entre blocos verticais |
| `--uc-space-page-margin` | `24px` | margem da pagina (16px abaixo de 760px, sobrescrita em `@media` no `_tokens.scss`) |
| `--uc-layout-nav` | `248px` | largura do menu lateral |
| `--uc-layout-feed` | `600px` | largura da coluna do feed |
| `--uc-layout-aside` | `340px` | largura da coluna lateral |
| `--uc-layout-wide` | `1040px` | largura de telas largas |
| `--uc-layout-gap` | `32px` | espaco entre colunas |
| `--uc-touch-target` | `44px` | alvo de toque minimo no celular |

A rampa numerica `--uc-space-1` a `--uc-space-8` cobre os espacamentos comuns.
Um valor fora dela e uma escalada "Ask First", nao um literal.

### Raio (`rounded`)

| Token | Valor | Papel |
| --- | --- | --- |
| `--uc-radius-sm` | `8px` | marca, avatar de comunidade |
| `--uc-radius-default` | `10px` | item de menu suspenso, esqueleto, avatar quadrado |
| `--uc-radius-md` | `12px` | campo, item do menu lateral |
| `--uc-radius-lg` | `16px` | aviso, menu suspenso, toast |
| `--uc-radius-xl` | `20px` | bloco lateral (`uc-card`), estado vazio |
| `--uc-radius-full` | `9999px` | botao, badge, avatar |

### Elevacao

| Token | Valor | Papel |
| --- | --- | --- |
| `--uc-shadow-overlay` | `0 8px 32px rgba(24, 24, 27, 0.12), 0 1px 3px rgba(24, 24, 27, 0.06)` | menus suspensos, painel de notificacoes |
| `--uc-shadow-toast` | `0 8px 32px rgba(24, 24, 27, 0.18)` | toast escuro |

## Verificacao rapida

```bash
cd frontend
npm test          # tokens.spec.ts (tokens + este README + .uc-text-*),
                  # base.spec.ts (camada base) e scss-guard.spec.ts (nada hardcoded)
npm run build     # styles.scss compila sem erro de Sass
```
