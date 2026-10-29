# Camada de tokens de design (Story 14.1) e camada base (Story 14.7)

Esta pasta e a **fonte unica** de valores de design do frontend: paleta, escala
tipografica, espacamento, raio e a sombra de overlay. Tudo vem, verbatim, do
`DESIGN.md` da raiz do repositorio ("Campus Clean"), a fonte unica do sistema
visual. Mudou um valor la, muda aqui no mesmo PR.

> **Redesign em andamento (KAN-84).** A nova direção visual, com a proposta de
> tokens (o que entra, muda e sai) e o contraste de cada par, está em
> [`docs/decisoes/2026-10-24-nova-direcao-visual.md`](../../../docs/decisoes/2026-10-24-nova-direcao-visual.md).
> Os valores abaixo já são os do redesign (KAN-91, tarefa 1). Os tokens marcados
> "SAI" na tabela continuam declarados até os consumidores migrarem e saem em
> tarefas seguintes. O `DESIGN.md` da raiz ainda precisa ser alinhado.

## Arquivos

| Arquivo            | Papel                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `_tokens.scss`     | Bloco `:root` unico. Todas as custom properties `--uc-*`. Fonte da verdade.                                       |
| `_typography.scss` | Classes utilitarias `.uc-text-*`, uma por papel de tipografia. Compoem so `var(--uc-*)`.                          |
| `_base.scss`       | Camada base global (Story 14.7): reset, pintura do `body`, `font: inherit` em controles e anel de foco unico.     |
| `_breakpoints.scss` | Breakpoint(s) de layout (Story 14.4) como variavel Sass (`$uc-breakpoint-nav`), nao `--uc-*` - `@media` nao le custom property. So `@use`d por quem precisa, nao agregado em `styles.scss`. |
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

| Token | Valor | Papel |
| --- | --- | --- |
| `--uc-color-bg` | `#FFFFFF` | canvas base (KAN-91: era #FAFAF8) |
| `--uc-color-surface` | `#FFFFFF` | superficie de card |
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
| `--uc-color-orange` | `#BC4913` | SAI: sera removido quando os consumidores migrarem (KAN-91) |
| `--uc-color-orange-tint` | `#FDEEE6` | SAI: idem |
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
| `--uc-font-size-question` | `15px` | SAI: vira body |
| `--uc-font-size-body` | `15px` | corpo, texto corrido |
| `--uc-font-size-small` | `14px` | acoes, descricao |
| `--uc-font-size-meta` | `13px` | timestamps, contagens |
| `--uc-font-size-label` | `12px` | badge, legenda |
| `--uc-font-size-label-caps` | `10.5px` | SAI: labels em caixa alta |
| `--uc-font-weight-regular` | `400` | peso regular |
| `--uc-font-weight-medium` | `500` | peso medio |
| `--uc-font-weight-semibold` | `600` | peso de enfase |
| `--uc-font-weight-bold` | `700` | titulos, item ativo |
| `--uc-font-weight-caps` | `700` | SAI: peso de label-caps |
| `--uc-line-height-body` | `1.5` | line-height do corpo |
| `--uc-letter-spacing-greeting` | `-0.02em` | titulo de tela |
| `--uc-letter-spacing-label-caps` | `0.05em` | SAI: label-caps |

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
| `--uc-space-page-margin` | `24px` | margem da pagina (16px no celular) |
| `--uc-layout-nav` | `248px` | largura do menu lateral |
| `--uc-layout-feed` | `600px` | largura da coluna do feed |
| `--uc-layout-aside` | `340px` | largura da coluna lateral |
| `--uc-layout-wide` | `1040px` | largura de telas largas |
| `--uc-layout-gap` | `32px` | espaco entre colunas |
| `--uc-touch-target` | `44px` | alvo de toque minimo no celular |

Nao ha ramp numerico `--uc-space-{n}`: o `DESIGN.md` nao define um. Um consumidor
que precise de um pede via "Ask First".

### Raio (`rounded`)

| Token | Valor | Papel |
| --- | --- | --- |
| `--uc-radius-sm` | `8px` | controles pequenos |
| `--uc-radius-default` | `10px` | cards e inputs |
| `--uc-radius-md` | `12px` | campo, item de menu |
| `--uc-radius-lg` | `16px` | aviso, menu suspenso |
| `--uc-radius-xl` | `20px` | bloco lateral, painel |
| `--uc-radius-full` | `9999px` | botao, badge, avatar |

### Elevacao

| Token | Valor | Papel |
| --- | --- | --- |
| `--uc-shadow-overlay` | `0 8px 32px rgba(24, 24, 27, 0.12), 0 1px 3px rgba(24, 24, 27, 0.06)` | dropdowns |
| `--uc-shadow-toast` | `0 8px 32px rgba(24, 24, 27, 0.18)` | toasts |

## Verificacao rapida

```bash
cd frontend
npm test          # tokens.spec.ts (tokens + este README + .uc-text-*),
                  # base.spec.ts (camada base) e scss-guard.spec.ts (nada hardcoded)
npm run build     # styles.scss compila sem erro de Sass
```
