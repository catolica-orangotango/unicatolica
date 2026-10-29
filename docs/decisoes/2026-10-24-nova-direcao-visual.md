# Decisão: nova direção visual do front-end (redesign)

- **Data:** 2026-10-24
- **Estado:** proposta, aguardando aprovação do time no KAN-84
- **Ticket:** KAN-84 (Epic 14, KAN-14)
- **Arquitetura (AD-1 a AD-11):** sem alteração. Muda só a camada visual (`frontend/src/styles/` e `frontend/src/app/ui/`)
- **Mockups:** https://claude.ai/artifact/4J4Uk9aqZ8LZVt7H5FaHQL (link privado; o responsável compartilha com o time). Cópia versionada em [`docs/design/kan-84/`](../design/kan-84/)

## Contexto

O Campus Clean (Stories 14.1 a 14.7) deu ao front-end tokens e componentes consistentes, mas a crítica das 7 telas feita em 24/10 (notas de 8/24 a 22/40, em `.impeccable/critique/`) e o uso real mostraram quatro problemas:

- **Genérico:** nada na tela diz "universidade" nem "rede social"; parece um template.
- **Apagado:** cinza claro sobre quase-branco, corpo de 13,5px, rótulos em caixa-alta de 10,5px.
- **Torto:** todas as telas têm `max-width: 720px` encostado à esquerda, sem a coluna lateral prevista na Story 14.4, então sobra metade da tela à direita.
- **Pouco profissional:** sem navegação de celular (a barra lateral de 220px não cabe em 360px), estados de erro sem "Tentar de novo", foco perdido depois de cada ação.

Antes de chegar a esta direção, testamos e descartamos uma evolução do próprio Campus Clean e quatro direções "temáticas" (cartaz da Semana Acadêmica, sinalização do campus, caderneta de chamada, calendário acadêmico). O retorno foi que ficaram "quadradas" e sem cara de app moderno.

## Decisão

O UniCatólica passa a parecer um app moderno no nível de acabamento de **Threads/Bluesky** (rede social leve, centrada em texto e pessoas) e **Notion/Linear** (precisão e polimento). O bordô da Católica continua como cor de marca e vira a única cor de destaque e de ação.

O que muda em relação ao Campus Clean:

| Tema | Campus Clean | Redesign |
|---|---|---|
| Layout | Coluna de 720px encostada à esquerda | Três colunas centradas como um bloco: menu 248px, conteúdo 600px, lateral 340px. Telas de trabalho (fila, admin, descobrir) usam menu + 1040px |
| Celular | Mesma barra lateral, transborda em 360px | Barra superior + barra de abas inferior abaixo de 760px; lateral vira faixa rolável abaixo de 1180px |
| Cor de ação | Laranja tijolo (uma ação por tela) | Bordô, uma ação primária por tela. O laranja sai |
| Fonte | Pilha do sistema, corpo 13,5px | Inter, corpo 15px |
| Rótulos | Caixa-alta de 10,5px | Sem caixa-alta; nada abaixo de 11px (12px em rótulos, 13px em meta) |
| Forma | Raio 8 a 14px, cartões para tudo | Pílula em botões, raio 12px em campos, 20px em blocos laterais. Publicações do feed não são cartões: são linhas separadas por filete |
| Fundo | Papel #FAFAF8 | Branco, com cinzas neutros frios para superfícies |
| Estados | Erro em banner, carregando como falso vazio | Erro no campo; toast com "Tentar de novo" ou "Desfazer"; esqueleto ao carregar; vazio que convida a agir |

## Tokens propostos (`frontend/src/styles/_tokens.scss`)

Nomes no padrão atual `--uc-*`. "Entra" é token novo, "muda" mantém o nome com outro valor, "sai" deixa de existir.

### Cor

| Token | Hoje | Proposta | Situação |
|---|---|---|---|
| `--uc-color-bg` | #FAFAF8 | #FFFFFF | muda |
| `--uc-color-surface` | #FFFFFF | #FFFFFF | igual |
| `--uc-color-surface-muted` | | #F7F7F8 | entra (hover, avisos, publicação oculta) |
| `--uc-color-surface-strong` | | #F1F1F3 | entra (filtro segmentado, chips, avatar neutro) |
| `--uc-color-border` | #EAEAE6 | #ECECEE | muda (filetes decorativos) |
| `--uc-color-border-strong` | | #E2E2E6 | entra (botão secundário) |
| `--uc-color-border-input` | | #8E8E96 | entra (contorno de campo, 3:1) |
| `--uc-color-ink` | #1C1C1A | #18181B | muda |
| `--uc-color-ink-soft` | #6B6B66 | #66666E | muda |
| `--uc-color-ink-faint` | #6E6E68 | #707078 | muda (placeholder) |
| `--uc-color-maroon` | #7A1F2B | #7A1F2B | igual (marca, ação, foco) |
| `--uc-color-maroon-hover` | | #691A25 | entra |
| `--uc-color-maroon-tint` | | #F7ECEE | entra (papel, dia de hoje, halo do foco) |
| `--uc-color-orange` | #BC4913 | | sai |
| `--uc-color-orange-tint` | #FDEEE6 | | sai |
| `--uc-color-green-ok` | #3A7D5C | #2F6141 | muda |
| `--uc-color-green-tint` | | #EAF3EC | entra |
| `--uc-color-error` | #B3261E | #B3261E | igual |
| `--uc-color-error-tint` | | #FBEAE9 | entra |
| `--uc-color-warn` | | #8A5A00 | entra (ícone de aviso) |
| `--uc-color-warn-tint` | | #FDF5E7 | entra |
| `--uc-color-avatar-{blue,green,sand,violet}` | | #2B4A72, #2F6141, #6B4E1F, #4E3A72 | entra (iniciais) |
| `--uc-color-avatar-{blue,green,sand,violet}-bg` | | #E8EEF6, #EAF3EC, #F3EEE6, #EFEAF6 | entra (fundo do avatar) |
| `--uc-color-ink-nav` | | #3F3F46 | entra na KAN-91 (item de menu lateral, 10,44:1) |
| `--uc-color-ink-disabled` | | #8A8A93 | entra na KAN-91 (texto de controle desabilitado, isento do WCAG) |
| `--uc-color-error-border` | | #F0C9C6 | entra na KAN-91 (borda do aviso de erro) |
| `--uc-color-toast-ok` | | #B9E4C9 | entra na KAN-91 (ícone de sucesso sobre toast escuro) |
| `--uc-color-toast-error` | | #FFB4AB | entra na KAN-91 (ícone de erro sobre toast escuro) |

### Tipografia

| Token | Hoje | Proposta | Situação |
|---|---|---|---|
| `--uc-font-family-base` | pilha do sistema | `Inter, system-ui, -apple-system, 'Segoe UI', sans-serif` | muda (Inter carregada pelo `index.html`) |
| `--uc-font-size-greeting` | 22px | 22px | igual (título de tela; 24px em telas de trabalho via `--uc-font-size-title-lg`) |
| `--uc-font-size-title-lg` | | 24px | entra |
| `--uc-font-size-title` | | 17px | entra (título de seção, cartão) |
| `--uc-font-size-question` | 15px | | sai (vira `--uc-font-size-body`) |
| `--uc-font-size-body` | 13.5px | 15px | muda |
| `--uc-font-size-small` | | 14px | entra (ações, descrição) |
| `--uc-font-size-meta` | 12px | 13px | muda |
| `--uc-font-size-label` | | 12px | entra (badge, legenda) |
| `--uc-font-size-label-caps` | 10.5px | | sai |
| `--uc-font-weight-medium` | | 500 | entra |
| `--uc-font-weight-semibold` | 600 | 600 | igual |
| `--uc-font-weight-bold` | | 700 | entra (títulos, item ativo) |
| `--uc-font-weight-caps` | 700 | | sai |
| `--uc-letter-spacing-greeting` | -0.01em | -0.02em | muda |
| `--uc-letter-spacing-label-caps` | 0.05em | | sai |

### Espaçamento, layout, raio e sombra

| Token | Hoje | Proposta | Situação |
|---|---|---|---|
| `--uc-space-unit` | 4px | 4px | igual |
| `--uc-space-1` a `--uc-space-8` | | 4, 8, 12, 16, 20, 24, 32, 40px | entra (escala numérica) |
| `--uc-space-card-padding` | 18px | 18px | igual |
| `--uc-space-page-margin` | 32px | 24px (16px no celular) | muda |
| `--uc-layout-nav` / `-feed` / `-aside` / `-wide` | | 248px / 600px / 340px / 1040px | entra |
| `--uc-layout-gap` | | 32px | entra |
| quebras (variáveis Sass, não custom property) | | `$uc-bp-tablet: 1180px`, `$uc-bp-mobile: 760px` | entra |
| `--uc-radius-sm` | 6px | 8px | muda |
| `--uc-radius-default` | 8px | 10px | muda |
| `--uc-radius-md` | 12px | 12px | igual (campo, item de menu) |
| `--uc-radius-lg` | 14px | 16px | muda (aviso, menu suspenso) |
| `--uc-radius-xl` | | 20px | entra (bloco lateral, painel) |
| `--uc-radius-full` | 9999px | 9999px | igual (botão, badge, avatar) |
| `--uc-shadow-overlay` | 0 8px 24px rgba(0,0,0,.08) | 0 8px 32px rgba(24,24,27,.12), 0 1px 3px rgba(24,24,27,.06) | muda |
| `--uc-shadow-toast` | | 0 8px 32px rgba(24,24,27,.18) | entra |
| `--uc-touch-target` | | 44px | entra (mínimo no celular) |

O anel de foco global continua `2px solid var(--uc-color-maroon)` com `outline-offset: 2px`; campos ganham o halo `0 0 0 3px var(--uc-color-maroon-tint)`.

## Contraste (WCAG 2.2 AA)

Calculado pela fórmula de luminância relativa do WCAG. Texto exige 4,5:1; contorno de componente e ícone de estado, 3:1.

| Frente | Fundo | Contraste | Uso | Resultado |
|---|---|---|---|---|
| ink #18181B | bg #FFFFFF | 17,72:1 | texto principal | passa |
| ink #18181B | surface-muted #F7F7F8 | 16,55:1 | texto em aviso | passa |
| ink #18181B | surface-strong #F1F1F3 | 15,71:1 | chip, filtro ativo | passa |
| ink-soft #66666E | bg #FFFFFF | 5,69:1 | meta, descrição | passa |
| ink-soft #66666E | surface-muted #F7F7F8 | 5,31:1 | meta em aviso | passa |
| ink-soft #66666E | surface-strong #F1F1F3 | 5,04:1 | filtro inativo | passa |
| ink-faint #707078 | bg #FFFFFF | 4,91:1 | placeholder | passa |
| #3F3F46 (item de menu) | bg #FFFFFF | 10,44:1 | menu lateral | passa |
| maroon #7A1F2B | bg #FFFFFF | 10,20:1 | link, aba ativa, foco | passa |
| maroon #7A1F2B | maroon-tint #F7ECEE | 8,84:1 | badge de papel, dia de hoje | passa |
| #FFFFFF | maroon #7A1F2B | 10,20:1 | botão primário | passa |
| #FFFFFF | maroon-hover #691A25 | 11,83:1 | botão primário em hover | passa |
| error #B3261E | bg #FFFFFF | 6,54:1 | erro de campo, botão de perigo | passa |
| error #B3261E | error-tint #FBEAE9 | 5,62:1 | aviso de erro | passa |
| green-ok #2F6141 | bg #FFFFFF | 7,22:1 | "Você é membro", "Criada" | passa |
| green-ok #2F6141 | green-tint #EAF3EC | 6,37:1 | avatar verde | passa |
| ink #18181B | warn-tint #FDF5E7 | 16,36:1 | texto de alerta | passa |
| warn #8A5A00 | warn-tint #FDF5E7 | 5,47:1 | ícone de alerta (3:1) | passa |
| avatar-blue #2B4A72 | #E8EEF6 | 7,74:1 | iniciais | passa |
| avatar-violet #4E3A72 | #EFEAF6 | 8,18:1 | iniciais | passa |
| avatar-sand #6B4E1F | #F3EEE6 | 6,65:1 | iniciais | passa |
| border-input #8E8E96 | bg #FFFFFF | 3,25:1 | contorno de campo (3:1) | passa |
| maroon #7A1F2B | bg #FFFFFF | 10,20:1 | anel de foco (3:1) | passa |
| border #ECECEE | bg #FFFFFF | 1,18:1 | filete divisório | decorativo, fora do 1.4.11 |
| border-strong #E2E2E6 | bg #FFFFFF | 1,29:1 | contorno de botão secundário | o botão é identificado pelo texto (10,44:1 ou mais), não pelo contorno |

Texto desabilitado (#8A8A93 sobre #F1F1F3) fica abaixo de 4,5:1 de propósito: o WCAG isenta componentes inativos.

## Componentes de `frontend/src/app/ui/`

Detalhe visual na folha [`docs/design/kan-84/componentes.html`](../design/kan-84/componentes.html).

- **`button[uc-button]`:** pílula; primário bordô (era laranja); entra a variante secundária de contorno e a de perigo; 36px no desktop, 44px no celular.
- **`<uc-badge>`:** sem caixa-alta; três usos (contador, papel, tipo) e o estado "Oculta pela moderação".
- **`<uc-member-indicator>`:** deixa de ser selo e vira o estado do botão Participar: "Entrando…", "Você é membro" na lista, "Membro" com menu (Sair com confirmação) na página da comunidade, "Só para alunos deste curso" quando não dá para entrar.
- **`<uc-card>`:** raio 20px, borda de 1px, sem sombra; só para blocos laterais. O feed usa linhas, não cartões.
- **`<uc-toast>`:** escuro, canto inferior; erro sempre com "Tentar de novo", ação reversível com "Desfazer"; `role="status"` (ou `alert` no erro); não some enquanto tem foco.
- **Novos:** campo de formulário (repouso, foco, erro, seleção), filtro segmentado, menu suspenso, barra de abas do celular, esqueleto de carregamento e estado vazio.

## Consequências

- `DESIGN.md` da raiz é reescrito para o novo sistema no primeiro ticket de implementação, junto com `_tokens.scss`, no mesmo PR, como manda `frontend/src/styles/README.md`. Até lá ele continua descrevendo o Campus Clean que está no ar.
- `tokens.spec.ts` e `scss-guard.spec.ts` precisam ser atualizados no mesmo PR dos tokens (tokens que saem, entram e mudam).
- A implementação vira tickets da sprint seguinte, um por grupo de telas, com critérios verificáveis contra os mockups: (1) casca, tokens e componentes de `ui/`; (2) Entrar e Criar conta; (3) Início do aluno e do moderador; (4) Comunidades e Comunidade; (5) Perfil; (6) Fila de denúncias; (7) Painel admin. Os itens marcados como "backend pendente" nos mockups (abrir com `#anotacoes`) dependem de contrato novo no `openapi.yaml` (AD-4) e entram nos tickets dos respectivos módulos.
- Os 4 bugs achados na crítica (login ignora `EMAIL_NAO_CONFIRMADO`, perfil perde o interesse digitado, botão da comunidade sobrepõe o nome em 360px, foco bordô invisível na faixa bordô) entram nos tickets das telas correspondentes.
