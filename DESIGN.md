---
name: UniCatólica (Campus Clean)
description: Sistema visual leve e claro da rede social acadêmica da UniCatólica. Produtividade calma, com a identidade institucional em traços, não em fundos.
colors:
  bg: "#FAFAF8"
  surface: "#FFFFFF"
  border: "#EAEAE6"
  ink: "#1C1C1A"
  ink-soft: "#6B6B66"
  ink-faint: "#6E6E68"
  maroon: "#7A1F2B"
  orange: "#BC4913"
  orange-tint: "#FDEEE6"
  green-ok: "#3A7D5C"
  error: "#B3261E"
typography:
  greeting:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  question:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  label-caps:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "10.5px"
    fontWeight: 700
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  DEFAULT: "8px"
  md: "12px"
  lg: "14px"
  full: "9999px"
spacing:
  unit: "4px"
  card-padding: "18px"
  section-gap: "20px"
  page-margin: "32px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "4px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  badge-course:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.maroon}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-open:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.orange}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 10px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 10px"
  nav-item-active:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.orange}"
    typography: "{typography.body}"
    rounded: "{rounded.DEFAULT}"
    padding: "8px 10px"
  member-indicator:
    backgroundColor: "transparent"
    textColor: "{colors.green-ok}"
    typography: "{typography.meta}"
  toast:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: UniCatólica (Campus Clean)

> Fonte única do sistema visual. Os valores do frontmatter são normativos e estão espelhados, um a um, em `frontend/src/styles/_tokens.scss` (custom properties `--uc-*`), travados por `tokens.spec.ts`. Mudou um valor aqui, muda lá no mesmo PR, e vice-versa. O comportamento (fluxos, estados, microcopy) fica em `docs/produto/ux-experiencia.md`; o produto, em `PRODUCT.md`.

## Overview

**Creative North Star: "Produtividade Calma"**

A UniCatólica parece um app de produtividade sereno, não um portal de notícias nem uma rede social barulhenta. O aluno entra entre uma aula e outra para ver o que a turma postou, votar numa enquete ou achar um material, e a interface sai do caminho: canvas quase branco, cards de baixo contraste delimitados por borda fina, uma única cor de ação usada com parcimônia. O moderador, que volta todo dia para a fila de denúncias, encontra a mesma calma, e decide com clareza porque nada na tela grita.

A hierarquia vem de tamanho, peso e espaço, nunca de caixa-alta pesada, cor de fundo ou sombra. A identidade da CatólicaSC está presente, mas em traços: o marcador da marca, o ponto de uma comunidade de curso, o anel de foco. Essa é a principal ruptura com o protótipo Figma original, que usava o bordô como fundo dominante de tela, no estilo de portal de notícias; o sistema abandonou isso de propósito, assim como as formas orgânicas desfocadas do fundo do login antigo.

A densidade é média e o texto é pequeno (corpo de 13.5px): é uma ferramenta de leitura rápida e recorrente, não uma página de leitura longa. Modo escuro está fora do MVP.

**Key Characteristics:**
- Canvas quase branco e cards brancos com borda de 1px, sem sombra.
- Uma cor de ação (Laranja Tijolo), no máximo uma vez por tela.
- Bordô Católica só como traço ou ícone, nunca como fundo de bloco.
- Pilha de fontes do sistema, pesos 400 e 600 apenas (700 só em label em caixa alta).
- Formas em pill para ações e badges; cantos moderados para cards e campos.
- Contraste mínimo de 4.5:1 em todo texto (WCAG 2.2 AA), verificado por axe no CI.

## Colors

Paleta neutra e quente, com uma cor institucional discreta e uma única cor de ação.

### Primary
- **Laranja Tijolo** (orange): o único acento de ação do sistema. Botão primário ("Participar", "Publicar", "Entrar"), item ativo da navegação e badge de comunidade aberta. Foi escurecido no KAN-71 para passar 4.5:1 com texto branco e sobre `orange-tint`.
- **Pêssego Suave** (orange-tint): fundo de badge, de item de navegação ativo e de hover em listas e menus. Nunca é cor de texto.

### Secondary
- **Bordô Católica** (maroon): a cor institucional herdada da CatólicaSC. Marcador da marca (quadrado de 24px ao lado do nome), ponto de comunidade de curso na sidebar, texto do badge de curso, avatar padrão e o anel de foco global. Nunca fundo de bloco maior que um ícone, badge ou avatar.

### Tertiary
- **Verde Confirmação** (green-ok): o único token de sucesso. Indicador "Membro", ícone do toast, qualquer confirmação positiva. Sempre acompanhado de texto, nunca só a cor.
- **Vermelho Alerta** (error): texto de erro em validação e falha de login ou cadastro, borda de aviso de erro, contador de notificações não lidas e borda de bloco de ação perigosa no painel admin. Aviso de erro é borda mais texto sobre `surface`, nunca bloco preenchido.

### Neutral
- **Papel** (bg): canvas de toda tela, sidebar e topbar. Quase branco, para não ficar clínico.
- **Branco Card** (surface): fundo de card, campo, dropdown, toast e card do login. Também o texto do botão primário.
- **Linha Fina** (border): borda de 1px de card, campo e botão secundário, e divisórias. Nunca carrega hierarquia de importância.
- **Tinta** (ink): texto de conteúdo principal, títulos, labels de formulário.
- **Tinta Suave** (ink-soft): texto secundário (metadados, timestamps, subtítulos, placeholder de campo).
- **Tinta Leve** (ink-faint): texto terciário (estados vazios, itens inertes de navegação, ações discretas do feed). Desde o KAN-71 tem quase o mesmo valor de `ink-soft`; a diferença entre secundário e terciário vem de tamanho e peso, não de cor.

### Named Rules
**The One Orange Rule.** Laranja Tijolo aparece em no máximo uma ação por tela. Se duas coisas disputam "este é o botão importante", uma delas está errada e vira botão secundário ou link.

**The Trace Rule.** Bordô Católica é traço, nunca parede. Nenhum bloco maior que um avatar recebe bordô de fundo.

**The 4.5 Rule.** Todo texto tem razão de contraste de pelo menos 4.5:1 sobre `bg`, `surface` e `orange-tint`. Nenhuma cor fora dos tokens entra numa tela; o `scss-guard.spec.ts` quebra o build com um hex literal.

## Typography

**Body Font:** pilha do sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`) em todos os papéis.

**Character:** neutra e nativa de cada sistema operacional, o que deixa a interface com cara de ferramenta e não de marca. É uma escolha pragmática, não uma identidade tipográfica deliberada: uma fonte de exibição própria continua como pendência do time e, se vier, entra como revisão explícita deste arquivo.

### Hierarchy
- **Greeting** (600, 22px, tracking -0.01em): o maior papel do sistema. Saudação do Início ("Olá, Julia"), título de tela (login, cadastro, painel).
- **Question** (600, 15px): título de card, pergunta de enquete, título de seção dentro de uma tela.
- **Body** (400, 13.5px, line-height 1.5): corpo de postagem, texto corrido, campos de formulário, itens de navegação, botão primário. Aplicado uma vez no `body` pela camada base.
- **Meta** (400, 12px): timestamps, contagens, subtítulos, labels de formulário (em 600), badges, botão secundário.
- **Label Caps** (700, 10.5px, tracking 0.05em, caixa alta): rótulos de seção da sidebar e marcas como "Enquete da universidade". O único lugar onde o peso 700 é permitido.

Cada papel tem uma classe utilitária `.uc-text-*` em `frontend/src/styles/_typography.scss`; um componente `uc-*` usa o próprio estilo em vez da classe.

### Named Rules
**The Two Weights Rule.** Ênfase é 600, todo o resto é 400. O 700 existe só para `label-caps`, e nada passa de 700. Peso pesado e caixa-alta em título eram a assinatura do protótipo antigo.

## Layout

Grid de app persistente para usuário autenticado: sidebar de navegação fixa à esquerda (~220px, rolagem própria, borda direita de 1px) e área principal fluida, com uma topbar fixa de ~64px que segura o avatar no canto direito. O painel de descoberta à direita (~260px em telas largas) é intenção do planejamento e ainda não existe no shell. As telas públicas (login, cadastro, confirmação de e-mail) usam uma casca própria: card único centralizado, com largura máxima de 400px, a marca acima.

O ritmo vertical parte de uma unidade de 4px composta com `calc()`; não existe escala numérica de espaçamento. Três medidas nomeadas fazem quase todo o trabalho: `card-padding` (18px, fora do grid de 4px de propósito) dentro de todo card, `section-gap` (20px) entre blocos verticais (aviso, enquete, feed) e `page-margin` (32px) como margem lateral do conteúdo e distância do toast até a borda.

Larguras estruturais que o sistema não fixa (sidebar, coluna de leitura do feed, mínimo de card na grade) entram no SCSS com o marcador `// layout-literal: <motivo>`, a única exceção que o guard aceita. Breakpoints e o colapso da sidebar abaixo do desktop ainda não estão definidos, embora o RNF02 exija o navegador mobile funcionando.

## Elevation & Depth

O sistema é plano. Cards, campos e a casca do login se separam do canvas por borda de 1px e pela troca de `bg` para `surface`, nunca por sombra. A única sombra é a de overlay, para o que flutua sobre o conteúdo.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08)`): dropdown do avatar, painel de notificações e toast. Difusa e leve; valor de partida, ajustável.

### Named Rules
**The Border-Not-Shadow Rule.** Conteúdo em repouso usa borda, não sombra. Sombra é só para o que está por cima de outra coisa, e nunca mais de um elemento com sombra na mesma tela ao mesmo tempo.

## Shapes

Cantos arredondados moderados, com o pill reservado para o que é clicável ou rotula comunidade. Chips, itens de menu e o marcador da marca usam 6px; campos, itens de navegação e avisos inline usam 8px; cards, dropdowns e toasts usam 12px; o card da casca pública usa 14px. Botões primário e secundário, badges, contador de notificações, avatar e o ponto de comunidade são pill ou círculo completo (9999px). Card de conteúdo nunca é pill.

## Components

### Buttons
Contidos e diretos: só um botão forte, e o resto se apaga.
- **Shape:** pill (9999px).
- **Primary** (`button[uc-button]`, `frontend/src/app/ui/button/`): fundo Laranja Tijolo, texto branco, corpo em 600, padding de 4px por 16px. Fica direto no `<button>` nativo, então `type`, `disabled` e participação em formulário são os nativos; o consumidor passa `type="button"` quando não deve enviar o formulário. Não tem variantes.
- **Focus:** anel de 2px em Bordô Católica com afastamento de 2px.
- **Disabled:** opacidade 0.5 e cursor `not-allowed`.
- **Secondary** (padrão das telas, ainda sem componente em `ui/`): pill transparente com borda de 1px em Linha Fina, texto Tinta, meta em 600, padding de 8px por 16px; desabilitado com opacidade 0.6. Aparece em cadastro, meu perfil e análise de denúncia, com pequenas variações (a análise usa `surface` e `ink-soft`). Candidato natural a virar `uc-button` secundário.
- **Text action:** botão transparente sem borda em Tinta Leve que sublinha no hover, para ações discretas dentro do feed (denunciar). Links secundários em formulários usam Tinta em 600 sublinhada, nunca laranja.

### Chips (badges de comunidade)
- **Style** (`<uc-badge>`): pill pequeno, fundo Pêssego Suave, meta em 600, padding de 2px por 8px.
- **Variants:** `course` com texto Bordô Católica, `open` com texto Laranja Tijolo. A variante é obrigatória e as duas nunca coexistem num badge.

### Cards / Containers
- **Corner Style:** 12px (`<uc-card>`); 14px no card da casca pública.
- **Background:** Branco Card sobre o canvas Papel.
- **Shadow Strategy:** nenhuma (ver Elevation & Depth).
- **Border:** 1px em Linha Fina; Vermelho Alerta só no bloco de ação perigosa do admin.
- **Internal Padding:** 18px; 28px no card da casca pública.

### Inputs / Fields
- **Style:** borda de 1px em Linha Fina, fundo Branco Card, texto Tinta em corpo, cantos de 8px, padding de 8px por 10px. Label acima em meta 600, Tinta.
- **Placeholder:** Tinta Suave, porque o placeholder carrega informação e Tinta Leve não passava 4.5:1 sobre branco antes do KAN-71.
- **Focus:** o anel global de 2px em Bordô Católica.
- **Error:** mensagem abaixo do formulário em Vermelho Alerta, meta, com borda de 1px em Vermelho Alerta e cantos de 8px sobre Branco Card. Aviso neutro (sessão expirada) usa o mesmo formato com borda Linha Fina e texto Tinta.

### Navigation
- **Sidebar:** marca no topo (quadrado Bordô Católica de 24px com 6px de canto, nome em corpo 600), depois a lista fixa da navegação global e a sublista "Suas comunidades".
- **Item:** corpo 400 em Tinta Suave, cantos de 8px, padding de 8px por 10px. Ativo: fundo Pêssego Suave, texto Laranja Tijolo, peso 600. Sem rota ainda: Tinta Leve e cursor padrão.
- **Comunidade:** meta em Tinta Suave com um ponto de 8px à esquerda (Linha Fina para aberta, Bordô Católica para curso); hover em Pêssego Suave.
- **Notificações:** item da sidebar com contador pill em Vermelho Alerta e texto branco em 10.5px; o painel abre abaixo do item, na largura da sidebar.
- **Topbar e conta:** avatar circular de 36px à direita; o dropdown (mínimo de 200px) e o painel de notificações abrem com fade de 150ms, desligado em `prefers-reduced-motion`.
- **Mobile:** ainda não definido.

### Member Indicator
Substitui o botão "Participar" depois que o usuário entra: texto Verde Confirmação em meta 600 com um ícone de check em `currentColor`, sem fundo. O rótulo nunca fica vazio (cai para "Membro"), para o estado não depender só da cor.

### Toast
Pilha fixa no canto inferior direito, a 32px das bordas. Cada toast é um card Branco Card com borda de 1px, cantos de 12px, sombra de overlay e ícone de check em Verde Confirmação; entra com fade e deslize de 150ms e some sozinho depois de 4 segundos, sem botão de fechar.

## Do's and Don'ts

### Do:
- **Do** consumir só `var(--uc-*)` e as classes `.uc-text-*`; um valor novo entra primeiro neste arquivo e em `_tokens.scss`, nunca como literal na tela.
- **Do** usar Laranja Tijolo para no máximo uma ação por tela, e botão secundário ou link para o resto.
- **Do** manter Bordô Católica como traço, ponto, ícone ou anel de foco.
- **Do** usar Verde Confirmação para qualquer confirmação positiva, sempre com texto ao lado.
- **Do** separar superfícies com borda de 1px em Linha Fina e a troca de Papel para Branco Card.
- **Do** dar a toda animação um fallback em `prefers-reduced-motion` e manter a duração em 150ms.
- **Do** adicionar a tela nova ao teste de axe em `frontend/e2e/acessibilidade.spec.ts`.

### Don't:
- **Don't** usar bordô (ou qualquer cor saturada) como fundo dominante de tela; é o que o sistema rejeitou do protótipo original.
- **Don't** usar caixa-alta pesada, tipografia condensada ou peso acima de 600 em títulos.
- **Don't** pôr sombra em card de conteúdo nem empilhar mais de um elemento com sombra na mesma tela.
- **Don't** preencher um bloco de vermelho para erro; erro é texto e borda.
- **Don't** usar Pêssego Suave como cor de texto, nem Tinta Leve para texto que precisa ser lido com atenção.
- **Don't** reintroduzir as formas orgânicas desfocadas do fundo do login antigo ou outros elementos gráficos decorativos.
- **Don't** criar token de modo escuro sem renegociar o escopo do MVP.
