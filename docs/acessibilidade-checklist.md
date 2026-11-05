# Checklist manual de acessibilidade

O RNF06 exige WCAG 2.2 nível AA. Parte disso é verificada sozinha: `frontend/e2e/acessibilidade.spec.ts` roda o axe em cada tela e falha com qualquer violação `serious` ou `critical` (T6, KAN-71).

Ferramenta automática não cobre tudo. Teclado, ordem de foco, leitor de tela e zoom precisam de uma pessoa. Esta é a exceção prevista na regra "teste é parte da entrega" (`decisoes/2026-09-27-cobertura-de-testes.md`, T6): **toda tela nova ou alterada passa por este checklist antes de ir para Teste**, e quem testa registra no ticket o que conferiu.

## Como testar

- **Teclado:** desconecte o mouse ou não use. `Tab` e `Shift+Tab` andam, `Enter` e `Espaço` acionam, `Esc` fecha painel.
- **Leitor de tela:** NVDA no Windows, Orca no Linux ou VoiceOver no macOS, com o Chrome.
- **Zoom:** `Ctrl` + `+` até 200%, e janela com 320px de largura (DevTools, modo responsivo).

## Itens gerais (toda tela)

- [ ] Todo elemento interativo é alcançável por `Tab`, na ordem visual (de cima para baixo, da esquerda para a direita). *WCAG 2.1.1, 2.4.3*
- [ ] O foco é sempre visível e não fica escondido atrás da barra superior ou de um painel. *2.4.7, 2.4.11*
- [ ] Nenhum lugar prende o foco: dá para sair de todo painel com `Tab` ou `Esc`. *2.1.2*
- [ ] O leitor anuncia cada campo com o rótulo, e não só com o placeholder. *1.3.1, 3.3.2*
- [ ] Erro de validação fica logo abaixo do campo, em texto e ícone (não só em cor), e o leitor o lê ao focar o campo: a mensagem é ligada por `aria-describedby` e o campo tem `aria-invalid="true"`, sem `role="alert"` (o `<uc-field>` faz isso sozinho). *3.3.1, 1.4.1, 1.3.1*
- [ ] Toast de sucesso ou erro é anunciado pelo leitor (contêiner `role="status"`, toast de erro `role="alert"`), e a confirmação também aparece na tela de forma persistente quando for crítica. *4.1.3*
- [ ] Com zoom de 200% e com 320px de largura, nada é cortado e não aparece rolagem horizontal. *1.4.4, 1.4.10*
- [ ] Alvos de clique têm pelo menos 24×24 px, ou espaço suficiente entre eles. Abaixo de 760px, botão, aba, campo e botões da barra superior têm 44px de altura. *2.5.8*
- [ ] O título da aba descreve a tela ("Meu perfil", seguido do nome UniCatólica). O e2e já confere o texto; aqui confira se ele faz sentido para quem usa leitor de tela. *2.4.2*

## Por tela

| Tela | O que conferir além dos itens gerais |
|---|---|
| Login (`/login`) | Erro de credencial anunciado pelo leitor; `Enter` no campo de senha envia o formulário. |
| Cadastro (`/cadastro`) | Lista de cursos navegável por teclado; os erros de cada campo são lidos ao focar o campo. |
| Confirmar e-mail (`/confirmar-email`) | O resultado (confirmado ou link inválido) é lido ao abrir a página; o link de volta é alcançável. |
| Shell: menu lateral | Lido como landmark "Navegação principal"; item ativo anunciado como "página atual" (`aria-current="page"`); itens de "Em breve" (Busca, Mensagens, Criar enquete) são pulados pelo `Tab`. |
| Shell: menu da conta | Vale para o cartão da conta (pé do menu lateral) e para o avatar da barra superior do celular. O botão anuncia "menu" e se está expandido (`aria-haspopup`, `aria-expanded`); `Enter` abre com o foco no primeiro item habilitado; setas percorrem os itens, com volta; "Configurações" é anunciado como indisponível; `Esc` ou escolher um item fecha e o foco volta ao botão. |
| Shell: notificações | O botão anuncia quantas não lidas há; `Esc` fecha e o foco volta ao botão (item do menu lateral ou aba do celular); o item leva ao link certo. |
| Shell: barra de abas (até 760px) | Lida como landmark "Navegação inferior"; a aba ativa é anunciada como "página atual" (`aria-current="page"`); cada aba tem pelo menos 44px; a aba de Notificações ou Denúncias anuncia a contagem no nome, já que o contador visual é `aria-hidden`. |
| Shell: gaveta "Suas comunidades" (até 760px) | O botão da barra superior anuncia se a gaveta está aberta (`aria-expanded`); a gaveta mostra só a lista de comunidades; com ela aberta, `Tab` e `Shift+Tab` ficam presos dentro dela; `Esc` fecha e o foco volta ao botão; fechada, nada dela recebe foco. |
| Toast | Pausa enquanto o foco está nele (dá para chegar com `Tab` a "Desfazer" ou "Tentar de novo" sem ele sumir) e retoma ao sair; acionar a ação dispensa o toast e o foco volta ao elemento de origem (ou ao `main`), nunca para o `body`. |
| Filtro segmentado (`<uc-segmented>`) | Lido como grupo de rádios com nome; só a opção selecionada está no `Tab`; setas, `Home` e `End` mudam a seleção e o foco; a opção anuncia "selecionado". |
| Menu suspenso (`<uc-menu>`, ex.: botão "Membro" do `<uc-member-indicator>`) | Ao abrir, o foco vai para o primeiro item habilitado; setas percorrem, com volta; `Esc` ou escolher um item fecha e devolve o foco ao botão que abriu; clicar fora ou tirar o foco fecha sem mover o foco; item desabilitado é anunciado como indisponível e não faz nada. |
| Início (`/feed`) | Lista "Descubra comunidades" lida como lista; o estado vazio é lido. |
| Lista de comunidades (`/comunidades`) | Campo de busca e tipo com nome lido pelo leitor; paginação anuncia a página atual. |
| Criar comunidade (`/comunidades/nova`) | Enviar sem nome leva o foco ao campo e o erro é lido; "Nome já em uso" é anunciado como alerta. |
| Detalhe da comunidade (`/comunidades/:id`) | Caixa de postar com rótulo e contador de caracteres anunciado; "Denunciar" abre o formulário de motivo no card, o foco vai para ele, e o resultado do envio é lido. |
| Meu perfil (`/perfil`) | Adicionar e remover interesse por teclado; o chip removido é anunciado; "Perfil salvo" é lido. |
| Perfil de outro usuário (`/usuarios/:id`) | Conteúdo somente leitura, sem botões de edição no caminho do `Tab`. |
| Moderação (`/moderacao/denuncias`) | Filtros anunciam qual está ativo; ao ocultar, restaurar ou descartar, o resultado é anunciado e o foco não se perde. |

## Telas novas

Ao criar uma tela:

1. Dê um `title:` à rota em `app.routes.ts`, só com o nome da tela; o sufixo com o nome UniCatólica vem do `TituloStrategy`.
2. Acrescente um teste em `frontend/e2e/acessibilidade.spec.ts` que abra a tela em cada estado (vazio, com erro, com conteúdo), confira o título com `toHaveTitle` e chame `esperarSemViolacoes(page)`.
3. Acrescente uma linha na tabela acima com o que for específico dela.
