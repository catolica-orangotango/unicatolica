---
name: UniCatólica
description: Sistema visual da rede social acadêmica da UniCatólica, redesenhado no KAN-84 e implementado no KAN-91. App moderno, leve e centrado em texto e pessoas, com o bordô da Católica como única cor de marca e de ação.
colors:
  bg: "#FFFFFF"
  surface: "#FFFFFF"
  surface-muted: "#F7F7F8"
  surface-strong: "#F1F1F3"
  border: "#ECECEE"
  border-strong: "#E2E2E6"
  border-input: "#8E8E96"
  ink: "#18181B"
  ink-soft: "#66666E"
  ink-faint: "#707078"
  ink-nav: "#3F3F46"
  ink-disabled: "#8A8A93"
  maroon: "#7A1F2B"
  maroon-hover: "#691A25"
  maroon-tint: "#F7ECEE"
  green-ok: "#2F6141"
  green-tint: "#EAF3EC"
  error: "#B3261E"
  error-tint: "#FBEAE9"
  error-border: "#F0C9C6"
  warn: "#8A5A00"
  warn-tint: "#FDF5E7"
  toast-ok: "#B9E4C9"
  toast-error: "#FFB4AB"
  avatar-blue: "#2B4A72"
  avatar-blue-bg: "#E8EEF6"
  avatar-green: "#2F6141"
  avatar-green-bg: "#EAF3EC"
  avatar-sand: "#6B4E1F"
  avatar-sand-bg: "#F3EEE6"
  avatar-violet: "#4E3A72"
  avatar-violet-bg: "#EFEAF6"
typography:
  greeting:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  title-lg:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 700
  body:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
  meta:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  sm: "8px"
  DEFAULT: "10px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  unit: "4px"
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "32px"
  "8": "40px"
  card-padding: "18px"
  section-gap: "20px"
  page-margin: "24px"
  touch-target: "44px"
layout:
  nav: "248px"
  feed: "600px"
  aside: "340px"
  wide: "1040px"
  gap: "32px"
breakpoints:
  tablet: "1180px"
  mobile: "760px"
shadows:
  overlay: "0 8px 32px rgba(24, 24, 27, 0.12), 0 1px 3px rgba(24, 24, 27, 0.06)"
  toast: "0 8px 32px rgba(24, 24, 27, 0.18)"
components:
  button-primary:
    backgroundColor: "{colors.maroon}"
    textColor: "{colors.surface}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 18px"
  button-primary-hover:
    backgroundColor: "{colors.maroon-hover}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border-strong}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 18px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    borderColor: "{colors.error-border}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 18px"
  button-disabled:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink-disabled}"
    rounded: "{rounded.full}"
  button-large:
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    height: "{spacing.touch-target}"
    padding: "0 22px"
  badge-counter:
    backgroundColor: "{colors.maroon}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "22px"
  badge-role:
    backgroundColor: "{colors.maroon-tint}"
    textColor: "{colors.maroon}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-course:
    backgroundColor: "{colors.maroon-tint}"
    textColor: "{colors.maroon}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-open:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink-nav}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-state:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-nav}"
    borderColor: "{colors.border-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border-input}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "{spacing.touch-target}"
    padding: "0 14px"
  input-focus:
    borderColor: "{colors.maroon}"
    halo: "0 0 0 3px {colors.maroon-tint}"
  input-error:
    borderColor: "{colors.error}"
    halo: "0 0 0 3px {colors.error-tint}"
  note:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
  empty-state:
    backgroundColor: "transparent"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.xl}"
    padding: "32px 16px"
  skeleton:
    backgroundColor: "{colors.surface-strong}"
    rounded: "{rounded.DEFAULT}"
    height: "12px"
  segmented:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    height: "38px"
  segmented-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border-strong}"
    rounded: "{rounded.full}"
  menu:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.lg}"
    shadow: "{shadows.overlay}"
    padding: "8px"
  menu-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-nav}"
    typography: "{typography.small}"
    rounded: "{rounded.DEFAULT}"
    height: "40px"
    padding: "0 12px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-nav}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "46px"
  nav-item-active:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    fontWeight: 700
  member-indicator:
    backgroundColor: "transparent"
    textColor: "{colors.green-ok}"
    typography: "{typography.small}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    shadow: "{shadows.toast}"
    padding: "10px 10px 10px 16px"
  tabbar:
    backgroundColor: "{colors.bg}"
    borderColor: "{colors.border}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    height: "64px"
  topbar:
    backgroundColor: "{colors.bg}"
    borderColor: "{colors.border}"
    height: "56px"
---

# Design System: UniCatólica

> Fonte única do sistema visual. Os valores do frontmatter são normativos e estão espelhados, um a um, em `frontend/src/styles/_tokens.scss` (custom properties `--uc-*`, sem o prefixo aqui), travados por `tokens.spec.ts`; as quebras de layout ficam em `frontend/src/styles/_breakpoints.scss` como variáveis Sass. Mudou um valor aqui, muda lá no mesmo PR, e vice-versa. A decisão que originou este sistema e a tabela completa de contraste estão em `docs/decisoes/2026-10-24-nova-direcao-visual.md`; a referência visual, em `docs/design/kan-84/` (`base.css`, `componentes.html` e uma página por tela). O comportamento (fluxos, estados, microcopy) fica em `docs/produto/ux-experiencia.md`; o produto, em `PRODUCT.md`.

## Overview

**Creative North Star: "Rede leve, acabamento preciso"**

A UniCatólica parece um app moderno de verdade: a leveza de Threads e Bluesky (rede social centrada em texto e pessoas) com a precisão e o polimento de Notion e Linear. O aluno entra entre uma aula e outra para ver o que a turma postou, achar um material ou entrar numa comunidade, e a interface sai do caminho: fundo branco, cinzas neutros frios, filetes finos no lugar de caixas e uma única cor de destaque. O moderador, que volta todo dia para a fila de denúncias, encontra a mesma calma e decide com clareza porque nada na tela grita.

O bordô da CatólicaSC é a cor de marca e a única cor de ação: botão primário, marca, contador, papel do membro e anel de foco. A hierarquia vem de tamanho, peso e espaço, nunca de maiúsculas, fundo colorido ou sombra. Direções que imitam objetos impressos (cartaz, caderneta, agenda) ou que deixam tudo em cantos retos foram testadas no KAN-84 e recusadas.

Este sistema substitui o Campus Clean (Stories 14.1 a 14.7), cujas telas ficaram genéricas, apagadas, encostadas à esquerda e sem navegação de celular. O que mudou e por quê está na decisão de 24/10/2026.

Modo escuro está fora do MVP.

**Key Characteristics:**
- Fundo branco, cinzas neutros frios para superfícies, filete de 1px como separador.
- Bordô como única cor de marca e de ação, com uma ação primária por tela.
- Inter, corpo de 15px, rótulos só com a primeira letra maiúscula e nada abaixo de 12px.
- Pílula em botões, badges e filtros; raio 12px em campos e 20px em blocos laterais.
- Publicações do feed são linhas separadas por filete, não cartões.
- Três colunas centradas como um bloco; barra superior e barra de abas no celular.
- Contraste mínimo de 4,5:1 em texto e 3:1 em contorno e ícone de estado (WCAG 2.2 AA), verificado por axe no CI.

## Colors

Paleta neutra e fria sobre branco, com uma cor institucional que faz todo o trabalho de destaque, mais tons de estado usados só onde há estado.

### Primary
- **Bordô Católica** (maroon): a cor de marca e de ação. Botão primário ("Publicar", "Entrar"), marcador da marca (quadrado com o "U"), contador de notificações e de denúncias, texto do badge de papel e de curso, avatar de comunidade de curso, link e o anel de foco global. Texto branco sobre bordô dá 10,20:1.
- **Bordô Escuro** (maroon-hover): fundo do botão primário em hover (11,83:1 com texto branco).
- **Bordô Claro** (maroon-tint): fundo do badge de papel e de curso, do dia de hoje e o halo de 3px do campo em foco. Nunca é cor de texto.

### Estados
- **Verde Confirmação** (green-ok) e **Verde Claro** (green-tint): sucesso. "Você é membro", "Criada", avatar verde. Sempre com texto ao lado, nunca só a cor.
- **Vermelho Alerta** (error), **Vermelho Claro** (error-tint) e **Borda de Erro** (error-border): erro de campo, botão de perigo, item de menu destrutivo e aviso de erro (fundo claro, ícone vermelho). Erro é texto e ícone sobre fundo claro, nunca bloco vermelho saturado.
- **Âmbar** (warn) e **Âmbar Claro** (warn-tint): só o ícone e o fundo do aviso de atenção; o texto do aviso continua em Tinta.
- **Ícones do toast** (toast-ok, toast-error): verde e vermelho claros para o ícone de sucesso e de erro sobre o toast escuro.

### Avatares
- Quatro pares de iniciais sobre fundo claro (avatar-blue, avatar-green, avatar-sand, avatar-violet, cada um com o `-bg`). A cor sai do id da pessoa ou da comunidade, em ciclo de quatro (`corDoAvatar`), e é estável entre telas. Comunidade de curso usa o avatar bordô; o avatar neutro usa Superfície Forte e Tinta de Menu.

### Neutral
- **Branco** (bg, surface): fundo de toda tela, das colunas, do card, do campo, do menu suspenso.
- **Superfície Suave** (surface-muted): hover de item de menu e de lista, aviso neutro, publicação oculta.
- **Superfície Forte** (surface-strong): trilho do filtro segmentado, badge de comunidade aberta, avatar neutro, fundo do botão desabilitado e do esqueleto.
- **Filete** (border): divisória decorativa entre publicações, das colunas e das barras, borda do card e do menu. Contraste baixo de propósito: é decoração, fora do 1.4.11.
- **Filete Forte** (border-strong): contorno do botão secundário, do badge de estado, da opção ativa do filtro e do estado vazio tracejado. O botão é identificado pelo texto, não pelo contorno.
- **Contorno de Campo** (border-input): borda de campo de formulário, 3,25:1 sobre branco (componente de formulário precisa de 3:1).
- **Tinta** (ink): texto principal, títulos, rótulo de campo, item ativo do menu, fundo do toast.
- **Tinta de Menu** (ink-nav): item do menu lateral e do menu suspenso, badge aberto e de estado (10,44:1).
- **Tinta Suave** (ink-soft): meta, descrição, aba inativa, opção inativa do filtro, título de seção do menu (5,69:1).
- **Tinta Leve** (ink-faint): placeholder (4,91:1).
- **Tinta Desabilitada** (ink-disabled): texto de controle desabilitado. Fica abaixo de 4,5:1 de propósito, porque o WCAG isenta componente inativo; nunca use para texto que precisa ser lido.

### Named Rules
**The One Maroon Action Rule.** Uma ação primária em bordô por tela. Se duas coisas disputam "este é o botão importante", uma delas vira botão secundário ou link.

**The Neutral Ground Rule.** Bordô aparece em traço, ícone, badge, avatar e botão, nunca como fundo de faixa, cabeçalho ou bloco grande. As superfícies são branco e cinza frio.

**The 4.5 Rule.** Todo texto tem pelo menos 4,5:1 sobre o fundo em que está; contorno de campo e ícone de estado, pelo menos 3:1. Nenhuma cor fora dos tokens entra numa tela: o `scss-guard.spec.ts` quebra o build com um hex literal.

## Typography

**Font:** Inter (`Inter, system-ui, -apple-system, 'Segoe UI', sans-serif`), carregada pelo `index.html` e aplicada uma vez no `body` por `_base.scss`. Os papéis não repetem `font-family`.

**Character:** neutra, legível em tamanho pequeno e com cara de produto moderno. A diferença entre papéis vem de tamanho e de peso (400, 500, 600, 700), não de maiúsculas nem de espaçamento de letra aberto.

### Hierarchy
- **Greeting** (600, 22px, tracking -0.02em): título de tela ("Olá, Julia", login, cadastro).
- **Title Large** (700, 24px, tracking -0.02em): título de tela de trabalho (fila de denúncias, painel admin, descobrir).
- **Title** (700, 17px): título de seção, de bloco lateral e de estado vazio; nome da marca.
- **Body** (400, 15px, line-height 1.5): corpo de publicação, texto corrido, campo, item do menu lateral. Aplicado no `body`.
- **Small** (400, 14px): ações, botão, descrição, aviso, toast, rótulo de campo (em 600), itens do menu suspenso.
- **Meta** (400, 13px): timestamps, contagens, dica e erro de campo.
- **Label** (600, 12px): badge, contador, rótulo da barra de abas, legenda. O menor texto do sistema.

Cada papel tem uma classe utilitária `.uc-text-*` em `frontend/src/styles/_typography.scss`; um componente `uc-*` usa o próprio estilo em vez da classe.

### Named Rules
**The Sentence Case Rule.** Rótulos, títulos de seção, botões e badges usam só a primeira letra maiúscula ("Suas comunidades", "Tentar de novo"). Nenhum `text-transform`, nenhum rótulo em maiúsculas com letra espaçada.

**The 12px Floor Rule.** Nada abaixo de 12px: 12px em rótulos e badges, 13px em meta, 15px no corpo.

**The Bold Is Hierarchy Rule.** 700 só em títulos, item ativo do menu e estado vazio; 600 para ênfase (botão, rótulo, badge); 500 para itens de menu e ações; 400 para o resto.

## Layout

**Casca autenticada** (`frontend/src/app/layout/shell/`): três colunas centradas como um único bloco, não encostadas à esquerda. Menu lateral de 248px (`layout-nav`), conteúdo de 600px (`layout-feed`) e coluna lateral de 340px (`layout-aside`), com 32px entre elas (`layout-gap`) e 24px de margem de página (`page-margin`). O menu é fixo no topo da janela com rolagem própria; a coluna de conteúdo tem filete de 1px à esquerda e à direita. A coluna lateral só existe quando a tela ativa registra conteúdo nela pelo `ShellLateralService`.

**Modo largo:** telas de trabalho (descobrir comunidades, fila de denúncias, admin) marcam `data: { largo: true }` na rota e usam menu + 1040px (`layout-wide`), sem coluna lateral.

**Quebras** (`_breakpoints.scss`, porque `@media` não lê custom property):
- **Até 1180px** (`$uc-bp-tablet`): a coluna lateral some; ficam menu + conteúdo.
- **Até 760px** (`$uc-bp-mobile`): uma coluna só. Entram a barra superior de 56px (marca, botão "Suas comunidades" e avatar com o menu da conta) e a barra de abas inferior de 64px (Início, Comunidades, Notificações ou Denúncias, Perfil). O menu lateral vira a gaveta "Suas comunidades", que desliza da esquerda entre as duas barras e mostra só a lista de comunidades. O conteúdo mantém a margem lateral de `page-margin` (24px) também no celular; os 16px previstos na decisão do KAN-84 ainda não foram aplicados.

**Telas públicas** (login, cadastro, confirmação de e-mail) usam a casca própria `<uc-auth-shell>`: card único centralizado, a marca acima.

**Ritmo:** unidade de 4px e a escala numérica `space-1` a `space-8` (4, 8, 12, 16, 20, 24, 32, 40px). Três medidas nomeadas completam: `card-padding` (18px), `section-gap` (20px) e `page-margin` (24px). Valor fora da escala é composto com `calc()` sobre `space-unit`; dimensão estrutural sem token (avatar de 34px, altura máxima de painel) leva o marcador `// layout-literal: <motivo>`, a única exceção que o guard aceita.

**Alvo de toque:** 44px (`touch-target`) no celular para botão, aba, campo e botão da barra superior; no desktop o botão tem 36px.

## Elevation & Depth

O sistema é plano. Colunas, blocos laterais, campos e publicações se separam por filete de 1px, nunca por sombra. Só o que flutua sobre o conteúdo tem sombra.

### Shadow Vocabulary
- **Overlay** (`0 8px 32px rgba(24, 24, 27, 0.12), 0 1px 3px rgba(24, 24, 27, 0.06)`): menu suspenso (conta, membro) e painel de notificações.
- **Toast** (`0 8px 32px rgba(24, 24, 27, 0.18)`): o toast escuro, mais forte para destacar do conteúdo.

### Named Rules
**The Hairline-Not-Shadow Rule.** Conteúdo em repouso usa filete, não sombra. Sombra é só para o que está por cima de outra coisa.

## Shapes

Cantos arredondados, nunca retos. Pílula (9999px) em tudo que é ação ou rótulo: botões, badges, filtro segmentado, ação do toast, avatar circular. 8px (`sm`) no marcador da marca e no avatar de comunidade; 10px (`DEFAULT`) em item do menu suspenso, esqueleto e avatar quadrado; 12px (`md`) em campo, item do menu lateral e cartão da conta; 16px (`lg`) em aviso, menu suspenso e toast; 20px (`xl`) em bloco lateral (`<uc-card>`), estado vazio e painel. Publicação do feed não tem forma própria: é uma linha entre filetes.

## Components

Todos em `frontend/src/app/ui/`, exportados por `ui/index.ts`. Detalhe visual em `docs/design/kan-84/componentes.html`.

### Icons
- **`<uc-icon>`:** ícone de traço (stroke 1.75, `currentColor`), 22px ou 18px (`size="sm"`). Sempre decorativo (`aria-hidden`): o nome acessível vem do botão ou link ao redor. Conjunto fechado (`UcIconName`): home, users, bell, user, search, dots, flag, eyeoff, check, x, alert, info, down, trash, plus, lock, shield, edit. No item ativo do menu e da barra de abas o traço fica mais grosso.

### Avatar
- **`<uc-avatar>`:** iniciais em 600 sobre fundo claro. Cores `marca` (bordô com texto branco), `neutro`, `azul`, `verde`, `areia` e `violeta`; formas `circulo` (pessoa) e `quadrado` (comunidade); tamanhos `sm` 34px, `md` 40px e `lg` 60px. As iniciais ficam em `aria-hidden`; quem usa dá o nome acessível.

### Buttons
Contidos e diretos: um botão forte, o resto se apaga.
- **Elemento:** `button[uc-button]` sobre o `<button>` nativo, então `type`, `disabled`, foco e participação em formulário são os nativos; o consumidor passa `type="button"` quando não deve enviar o formulário.
- **Shape e tamanho:** pílula de 36px no desktop, small em 600; `size="large"` (formulário de login e cadastro) tem 44px e corpo de 15px; abaixo de 760px todo botão tem 44px.
- **Primary** (padrão): fundo Bordô, texto branco; hover em Bordô Escuro.
- **Secondary** (`variant="secondary"`): fundo branco, contorno Filete Forte, texto Tinta; hover em Superfície Suave. É o "Participar".
- **Danger** (`variant="danger"`): fundo branco, contorno Borda de Erro, texto Vermelho Alerta; hover em Vermelho Claro. Para ação destrutiva ("Remover").
- **Disabled:** `disabled` ou `aria-disabled="true"`: fundo Superfície Forte, texto Tinta Desabilitada, sem contorno, cursor `not-allowed`, sem opacidade. Use `aria-disabled` quando o foco precisa ficar no botão (ex.: "Entrando…").
- **Focus:** anel de 2px em Bordô com afastamento de 2px.

### Chips (badges)
- **`<uc-badge>`:** pílula pequena em label (12px, 600), sem maiúsculas. A variante é obrigatória e exclusiva.
- **`counter`:** contador de 22px em Bordô com texto branco (notificações, denúncias pendentes). Na barra de abas encolhe para 18px sobre o canto do ícone. É `aria-hidden`: a contagem vai no nome acessível do botão.
- **`role`:** papel do membro ("Representante"), Bordô sobre Bordô Claro.
- **`course` e `open`:** tipo de comunidade. Curso usa o estilo de papel; aberta é neutra (Tinta de Menu sobre Superfície Forte).
- **`state`:** estado de conteúdo ("Oculta pela moderação"), com ícone eyeoff, contorno Filete Forte sobre branco.

### Cards / Containers
- **`<uc-card>`:** fundo branco, borda de 1px em Filete, raio 20px, padding de 18px, sem sombra e sem inputs. Só para blocos da coluna lateral ("Esta semana", descoberta) e painéis.
- **Publicação do feed:** não é card. Cada publicação é uma linha (avatar, nome, meta, texto, ações) separada da próxima por um filete de 1px em Filete.

### Inputs / Fields
- **`<uc-field>`:** rótulo acima (small 600, Tinta), o controle projetado, dica opcional (meta, Tinta Suave) e erro opcional (meta 500, Vermelho Alerta, com ícone alert).
- **Controle:** `input`, `select` ou `textarea` com a diretiva `ucInput`, que aplica a classe global `.uc-input` (`ui/field/_input.scss`) e, dentro de `<uc-field>`, liga `id`, `aria-invalid` e `aria-describedby` (dica e erro).
- **Repouso:** 44px de altura, borda de 1px em Contorno de Campo, raio 12px, corpo de 15px, padding lateral de 14px. Placeholder em Tinta Leve. `textarea` cresce a partir de 96px e redimensiona na vertical.
- **Foco:** borda Bordô e halo de 3px em Bordô Claro, além do anel global.
- **Erro:** `aria-invalid="true"` (ou `.uc-input--erro`): borda Vermelho Alerta e halo em Vermelho Claro; o erro vence o foco. A mensagem fica abaixo do campo, ligada por `aria-describedby`, sem `role="alert"`.
- **Seleção:** o `select` usa o mesmo contorno e mantém a seta nativa do navegador.

### Feedback: esqueleto, vazio e aviso
Toda lista tem três estados além do conteúdo: carregando, vazio e erro.
- **`<uc-skeleton>`:** barra de 12px, raio 10px, gradiente estático de Superfície Forte e Superfície Suave, sem animação, `aria-hidden`. A largura vem do consumidor; o contêiner recebe `aria-busy="true"` enquanto carrega. Carregar nunca mostra um falso vazio.
- **`<uc-empty-state>`:** caixa tracejada em Filete Forte, raio 20px, centralizada; título em title 700, descrição opcional em small Tinta Suave e uma ação projetada por `[acao]`. Convida a agir ("Nenhuma publicação ainda. Comece a conversa da sua turma.").
- **`<uc-note>`:** aviso em linha, raio 16px, small, título em 600 e ação opcional por `[acao]` (ex.: "Tentar de novo"). Tons `neutro` (Superfície Suave, ícone info), `alerta` (Âmbar Claro, ícone Âmbar) e `erro` (Vermelho Claro, ícone Vermelho). O tom `erro` usa `role="alert"`; os demais, `role="note"`.

### Segmented filter
- **`<uc-segmented>`:** grupo de rádios em pílula (`role="radiogroup"` com `role="radio"`). Trilho em Superfície Forte; opção de 38px em small 500 Tinta Suave; a ativa ganha fundo branco, contorno Filete Forte, Tinta e 600. Contador opcional em label Bordô. Clique seleciona; setas, Home e End movem a seleção e o foco (roving tabindex). No celular ocupa a largura toda, com opções de 44px divididas por igual.

### Dropdown menu
- **`<uc-menu>`:** painel `role="menu"` branco, borda Filete, raio 16px, sombra overlay, mínimo de 192px, abrindo `abaixo` ou `acima` do gatilho. Itens `role="menuitem"` de 40px em small 500 Tinta de Menu, raio 10px, hover e foco em Superfície Suave; item `perigo` em Vermelho Alerta; item `desabilitado` em Tinta Desabilitada com `aria-disabled`, sem emitir. Ao abrir, foco no primeiro item habilitado; setas com volta; Escape e seleção devolvem o foco ao `gatilho`; clicar fora ou tirar o foco fecha sem roubar o foco. O botão que abre é do consumidor, com `aria-haspopup="menu"` e `aria-expanded`, e precisa ser passado como `gatilho`.

### Navigation
- **Menu lateral** (`<nav aria-label="Navegação principal">`): marca no topo (quadrado Bordô de 30px com o "U" branco e o nome em title 700); depois Início, Comunidades, Denúncias (moderador e administrador, com contador), Notificações (abre o painel, com contador), Perfil e Administração (só administrador).
- **Item:** 46px, raio 12px, ícone de 22px e rótulo em corpo 500 Tinta de Menu; hover em Superfície Suave. Ativo: Tinta e 700, sem fundo, traço do ícone mais grosso, `aria-current="page"`.
- **Suas comunidades:** título de seção em small 600 Tinta Suave; cada comunidade com avatar quadrado de iniciais (bordô para curso, cor do id para aberta) e o nome; a ativa em 700. Vazio: "Você ainda não faz parte de nenhuma".
- **Em breve:** itens inertes (Busca, Mensagens, Criar enquete, Solicitações de fixação para moderador) em Tinta Suave, `aria-disabled`, fora do `Tab`.
- **Cartão da conta:** no pé do menu, avatar, nome, papel e o ícone dots; abre um `<uc-menu>` para cima com Perfil, Configurações (desabilitado) e Sair.
- **Notificações:** o painel (`role="menu"`) abre logo abaixo do item, no fluxo do menu, com sombra overlay e raio 12px; não lidas em 600.
- **Barra superior** (até 760px): 56px, fundo branco e filete embaixo; marca, botão "Suas comunidades" (abre a gaveta, `aria-expanded`) e avatar com o menu da conta. Botões de 44px.
- **Barra de abas** (até 760px, `<nav aria-label="Navegação inferior">`): 64px, fixa embaixo, filete em cima; quatro abas de pelo menos 44px com ícone e rótulo em label 500 Tinta Suave; a ativa em Tinta 600 com traço mais grosso e `aria-current="page"`. A terceira aba é Notificações para aluno (abre o painel acima da barra) e Denúncias para moderador e administrador.
- **Gaveta "Suas comunidades"** (até 760px): o próprio menu lateral, fixo entre as duas barras, deslizando em 200ms (sem animação com `prefers-reduced-motion`). Mostra só a lista de comunidades; prende o foco enquanto aberta e fecha com Escape, devolvendo o foco ao botão.

### Member Indicator
`<uc-member-indicator>` é o estado do botão Participar, não um selo. Todo estado tem texto.
- **`nao-membro`:** botão secundário "Participar".
- **`entrando`:** o mesmo botão com "Entrando…" e `aria-disabled` (o foco fica no lugar).
- **`membro`:** texto Verde Confirmação em small 600 com ícone check; rótulo padrão "Membro" (na lista, "Você é membro"). Rótulo vazio cai para "Membro".
- **`membro-menu`:** previsto para a página da comunidade (nenhuma tela usa ainda), botão secundário "Membro" com check e seta que abre um `<uc-menu>` com "Sair" (perigo).
- **`restrito`:** texto "Só para alunos deste curso" em meta Tinta Suave, quando a comunidade é de outro curso.

### Toast
- **`ToastService.mostrar(mensagem, { tipo, acao })`** com o `<uc-toast-host>` montado uma vez em `app.html`.
- **Visual:** escuro (fundo Tinta, texto branco, small 500), raio 16px, sombra toast, ícone check em toast-ok ou alert em toast-error. Pilha no canto inferior direito, a 24px das bordas; no celular ocupa a largura e fica acima da barra de abas. Entra com fade e deslize de 150ms, sem animação com `prefers-reduced-motion`.
- **Ação:** botão em pílula (Tinta de Menu, texto branco, 600). Ação reversível traz "Desfazer"; erro sempre traz "Tentar de novo". Acionar a ação dispensa o toast.
- **Tempo e foco:** some sozinho em 4 segundos, mas pausa enquanto tem foco e retoma quando o foco sai. Se o toast some com o foco dentro, o foco volta ao elemento de origem (ou ao `main`).
- **Anúncio:** o contêiner é `role="status"` (`aria-live="polite"`); o toast de erro é `role="alert"`.

## Accessibility

WCAG 2.2 nível AA (RNF06). O axe roda em cada tela em `frontend/e2e/acessibilidade.spec.ts` (violação serious ou critical quebra o CI); teclado, foco e leitor de tela seguem `docs/acessibilidade-checklist.md`.

- **Contraste:** pares principais sobre branco: Tinta 17,72:1, Tinta de Menu 10,44:1, Tinta Suave 5,69:1, Tinta Leve 4,91:1, Bordô 10,20:1, Vermelho Alerta 6,54:1, Verde Confirmação 7,22:1; branco sobre Bordô 10,20:1. Contorno de campo 3,25:1. A tabela completa está na decisão de 24/10/2026.
- **Foco:** anel único de 2px sólido em Bordô com afastamento de 2px (`_base.scss`, `:focus-visible`); campos somam o halo de 3px. Abrir e fechar painel nunca perde o foco: ele volta a quem abriu.
- **Alvos:** 44px no celular (botão, aba, campo, botões da barra superior, opções do filtro).
- **Estado nunca só por cor:** membro, erro, não lida e item ativo sempre têm texto, ícone ou peso junto.

## Do's and Don'ts

### Do:
- **Do** consumir só `var(--uc-*)` e as classes `.uc-text-*`; um valor novo entra primeiro neste arquivo e em `_tokens.scss`, nunca como literal na tela.
- **Do** usar Bordô para uma ação primária por tela, e botão secundário ou link para o resto.
- **Do** separar publicações e colunas com filete de 1px, e reservar `<uc-card>` para blocos laterais.
- **Do** escrever rótulos e botões só com a primeira letra maiúscula, e manter todo texto em 12px ou mais.
- **Do** dar a toda lista os estados de esqueleto, vazio que convida a agir e erro com "Tentar de novo".
- **Do** mostrar o erro de validação no próprio campo, ligado por `aria-describedby`.
- **Do** oferecer "Desfazer" no toast de ação reversível e "Tentar de novo" no de erro.
- **Do** garantir 44px de alvo no celular e devolver o foco a quem abriu cada painel.
- **Do** dar a toda animação um fallback em `prefers-reduced-motion`.
- **Do** adicionar a tela nova ao teste de axe em `frontend/e2e/acessibilidade.spec.ts`.

### Don't:
- **Don't** introduzir uma segunda cor de ação ou de destaque; o bordô é a única.
- **Don't** usar bordô como fundo de faixa, cabeçalho ou bloco grande.
- **Don't** escrever rótulo em maiúsculas, com letra espaçada ou abaixo de 12px.
- **Don't** transformar publicação do feed em card, nem pôr sombra em conteúdo em repouso.
- **Don't** mostrar "carregando" como uma lista vazia.
- **Don't** preencher bloco de vermelho saturado para erro; erro é texto, ícone e fundo claro.
- **Don't** usar Tinta Leve ou Tinta Desabilitada para texto que precisa ser lido.
- **Don't** imitar objeto impresso (cartaz, caderneta, agenda) nem usar cantos retos.
- **Don't** encostar o conteúdo à esquerda; a casca é um bloco centrado.
- **Don't** criar token de modo escuro sem renegociar o escopo do MVP.
