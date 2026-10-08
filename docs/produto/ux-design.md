---
name: UniCatólica — Campus Clean
description: Sistema visual leve e claro para a rede social acadêmica da UniCatólica — reduz a densidade de "portal de notícias" do protótipo original sem abandonar a identidade institucional.
status: final
created: 2026-08-17
updated: 2026-10-08
colors:
  bg: '#FAFAF8'
  surface: '#FFFFFF'
  border: '#EAEAE6'
  ink: '#1C1C1A'
  ink-soft: '#6B6B66'
  ink-faint: '#6E6E68'
  maroon: '#7A1F2B'
  orange: '#BC4913'
  orange-tint: '#FDEEE6'
  green-ok: '#3A7D5C'
typography:
  greeting:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
    fontSize: 22px
    fontWeight: '600'
    letterSpacing: -0.01em
  question:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
    fontSize: 15px
    fontWeight: '600'
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
    fontSize: 13.5px
    fontWeight: '400'
    lineHeight: '1.5'
  meta:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
    fontSize: 12px
    fontWeight: '400'
  label-caps:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif
    fontSize: 10.5px
    fontWeight: '700'
    letterSpacing: 0.05em
rounded:
  sm: 6px
  DEFAULT: 8px
  md: 12px
  lg: 14px
  full: 9999px
spacing:
  unit: 4px
  card-padding: 18px
  section-gap: 20px
  page-margin: 32px
components:
  badge-course:
    background: '{colors.orange-tint}'
    color: '{colors.maroon}'
    radius: '{rounded.full}'
  badge-open:
    background: '{colors.orange-tint}'
    color: '{colors.orange}'
    radius: '{rounded.full}'
  button-primary:
    background: '{colors.orange}'
    color: '#FFFFFF'
    radius: '{rounded.full}'
  member-indicator:
    color: '{colors.green-ok}'
---

## Brand & Style

**Campus Clean** — registro de "app de produtividade calmo", não de jornal nem de rede social barulhenta. É a direção que o usuário escolheu entre três exploradas (mockup: [`mockups/home-comunidade.html`](mockups/home-comunidade.html); alternativas descartadas em `.working/direction-social-pulse.html` e `.working/direction-editorial-modern.html`), justamente por reduzir a sensação de "portal de notícias" do protótipo Figma original (que usava vermelho/bordô como fundo dominante, estilo G1) sem perder a seriedade acadêmica da instituição.

A postura é: espaço em branco generoso, cards de baixo contraste, uma única cor de destaque usada com parcimônia. Hierarquia por tamanho e espaçamento — nunca por caixa-alta ou negrito pesado. As formas orgânicas desfocadas do fundo de login do protótipo original **não fazem parte desta direção** — Campus Clean resolve identidade visual por espaçamento e cor, não por elementos gráficos decorativos; ver `reconcile-figma-prototype.md` para o registro completo da divergência.

## Colors

- **`bg` (#FAFAF8) / `surface` (#FFFFFF)** — canvas base e superfícies de card. Quase branco, nunca branco puro no fundo geral, para reduzir a sensação clínica sem sacrificar contraste.
- **`border` (#EAEAE6)** — divisórias e contornos de card. Sempre sutil; nunca usado para hierarquia de importância.
- **`ink` (#1C1C1A) / `ink-soft` (#6B6B66) / `ink-faint` (#6E6E68)** — três níveis de texto: conteúdo principal, texto secundário (metadados, timestamps), texto terciário (labels, placeholders).
- **`maroon` (#7A1F2B)** — cor institucional da Católica SC, herdada do protótipo Figma. Uso deliberadamente mínimo: traço de marca, ícone ativo, títulos de comunidade de curso. **Nunca como fundo dominante de tela** — é a principal divergência visual em relação ao protótipo original.
- **`orange` (#BC4913)** — único acento de ação do sistema. Reservado para CTA primário (botões "Participar", "Publicar", link ativo na navbar) e para o badge "novo"/tag de destaque. Se outra cor começar a competir por atenção de ação, é sinal de que o token está sendo mal usado.
- **`orange-tint` (#FDEEE6)** — fundo suave para badges e estado ativo de item de navegação; nunca para texto.
- **`green-ok` (#3A7D5C)** — verde de sucesso genérico do sistema: indica "você é membro"/confirmação de associação e também qualquer outra confirmação positiva (ex.: formulário salvo, ação concluída). Um único token de sucesso, não dois.

**Contraste (RNF06, WCAG 2.2 AA).** Todo texto precisa de razão 4.5:1 sobre `bg`, `surface` e `orange-tint`, e o teste de acessibilidade dos e2e (axe) falha abaixo disso. Por isso `orange` (era #EA6A2E, 3.18:1 com texto branco) e `ink-faint` (era #A2A29C, 2.45:1 sobre `bg`) foram escurecidos em 08/10/2026 (KAN-71). Efeito colateral: `ink-faint` ficou muito próximo de `ink-soft`, então a diferença entre texto secundário e terciário passa a vir de tamanho e peso, não de cor.

**Modo escuro:** fora de escopo do MVP (decisão confirmada em conversa). Nenhum token dark é definido aqui.

## Typography

Pilha de fontes de sistema (`-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`) em todos os papéis — é o que a direção escolhida usa e o padrão vigente deste spine.

**Pendência para o time:** nenhuma tipografia de marca (Google Font ou similar) foi avaliada nesta sessão; a pilha de sistema é uma escolha pragmática, não uma decisão de identidade tipográfica deliberada. Se o time quiser uma fonte de exibição própria mais adiante, isso é uma revisão explícita deste DESIGN.md — não bloqueia a implementação com o padrão atual.

Escala observada, do maior papel ao menor:
- `greeting` (22px/600) — saudação no topo do Início ("Olá, Julia").
- `question` (15px/600) — perguntas de enquete, títulos de card.
- `body` (13.5px/400, lh 1.5) — corpo de postagem, texto corrido.
- `meta` (12px/400) — timestamps, contagens, texto secundário.
- `label-caps` (10.5px/700, tracking 0.05em) — labels em caixa alta: "Enquete da universidade", nomes de seção na sidebar.

Peso é sempre 400 (regular) ou 600 (semibold) para ênfase — 700 reservado só para `label-caps`. Nunca 800+; é o que distingue esta direção da "Social Pulse" descartada.

## Layout & Spacing

Grid de app persistente: sidebar de navegação (fixa, ~220px) + conteúdo principal (fluido) + painel lateral direito de descoberta (~260px) em telas largas. `page-margin` (32px) enquadra o conteúdo; `card-padding` (18px) é o padding interno padrão de qualquer card; `section-gap` (20px) separa blocos verticais (aviso → enquete → feed).

**Deferido para implementação:** breakpoints exatos e comportamento de colapso da sidebar/painel direito abaixo de desktop não foram especificados em conversa — o form-factor confirmado é "web only, desktop/responsivo" (RNF02 do PRD exige mobile browser funcional). Não bloqueia este spine; resolve-se quando as telas forem construídas (`bmad-architecture` ou `bmad-build`).

## Elevation & Depth

Elevação é discreta: cards usam borda de 1px (`border`) em vez de sombra pesada. A única sombra pronunciada observada na direção escolhida é o chrome de "janela de navegador" do mockup (decorativo, não faz parte do produto real). Dropdowns e toasts usam uma sombra leve e difusa — `0 8px 24px rgba(0,0,0,.08)` é o valor decidido de partida (extrapolado do padrão de card, ajustável em implementação se não funcionar bem no navegador real).

## Shapes

Cantos arredondados moderados: `sm` (6px) em chips e controles pequenos, `DEFAULT`/`md` (8–12px) em cards e inputs, `lg` (14px) no container externo de um bloco de app. `full` (pill) é reservado para badges de comunidade e botões de ação (Participar, CTA de enquete) — nunca para cards de conteúdo.

## Components

- **Badge de comunidade** (`badge-course`, `badge-open`): pill pequeno (`rounded.full`), fundo `orange-tint`, texto `maroon` (curso) ou `orange` (aberta). Aparece no header do card de post e no header da tela de comunidade. Nunca as duas cores num mesmo badge.
- **Botão primário** (`button-primary`): fundo `orange`, texto branco, pill. Único estilo de botão de ação forte no sistema — usado em "Participar", CTA de enquete, confirmar em formulários.
- **Indicador de membro** (`member-indicator`): texto `green-ok`, sem fundo, geralmente com um ícone de check — substitui o botão de ação quando o usuário já é membro.
- **Card genérico**: `surface` + `border` 1px + `rounded.md`, `card-padding` interno. Base de post, notícia, item de enquete.

Componentes comportamentais (formulário de enquete, comentários, notificações, busca) estão especificados em `EXPERIENCE.md` — este documento cobre só a casca visual deles.

## Do's and Don'ts

- **Do** usar `orange` para no máximo uma ação por tela — se duas coisas competem por "isso é o botão importante", uma delas está errada.
- **Do** manter `maroon` como traço/ícone, nunca como fundo de bloco maior que um ícone ou badge.
- **Don't** reintroduzir caixa-alta pesada ou tipografia condensada nos títulos — é a assinatura visual do protótipo original que este sistema deliberadamente abandona.
- **Don't** empilhar mais de um card com sombra pronunciada na mesma tela — a hierarquia vem de espaçamento, não de profundidade.
- **Do** usar `green-ok` para qualquer confirmação positiva do sistema — não só "membro/associação confirmada", mas ações concluídas em geral (ex.: formulário salvo).
