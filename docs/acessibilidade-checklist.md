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
- [ ] Erro de validação é anunciado pelo leitor quando aparece e fica perto do campo, em texto (não só em cor). *3.3.1, 1.4.1*
- [ ] Toast de sucesso ou erro é anunciado pelo leitor, e a confirmação também aparece na tela de forma persistente quando for crítica. *4.1.3*
- [ ] Com zoom de 200% e com 320px de largura, nada é cortado e não aparece rolagem horizontal. *1.4.4, 1.4.10*
- [ ] Alvos de clique têm pelo menos 24×24 px, ou espaço suficiente entre eles. *2.5.8*
- [ ] O título da aba descreve a tela ("Meu perfil — UniCatólica"). O e2e já confere o texto; aqui confira se ele faz sentido para quem usa leitor de tela. *2.4.2*

## Por tela

| Tela | O que conferir além dos itens gerais |
|---|---|
| Login (`/login`) | Erro de credencial anunciado pelo leitor; `Enter` no campo de senha envia o formulário. |
| Cadastro (`/cadastro`) | Lista de cursos navegável por teclado; os erros de cada campo são lidos ao focar o campo. |
| Confirmar e-mail (`/confirmar-email`) | O resultado (confirmado ou link inválido) é lido ao abrir a página; o link de volta é alcançável. |
| Shell: sidebar | Item ativo anunciado como "página atual"; itens sem rota ("Buscar", "Mensagens") são pulados pelo `Tab`. |
| Shell: menu da conta | `Enter` no avatar abre; setas ou `Tab` percorrem os itens; `Esc` fecha e o foco volta ao avatar. |
| Shell: notificações | O botão anuncia quantas não lidas há; `Esc` fecha e o foco volta ao botão; o item leva ao link certo. |
| Início (`/feed`) | Lista "Descubra comunidades" lida como lista; o estado vazio é lido. |
| Lista de comunidades (`/comunidades`) | Campo de busca e tipo com nome lido pelo leitor; paginação anuncia a página atual. |
| Detalhe da comunidade (`/comunidades/:id`) | Caixa de postar com rótulo e contador de caracteres anunciado; "Denunciar" abre o formulário de motivo no card, o foco vai para ele, e o resultado do envio é lido. |
| Meu perfil (`/perfil`) | Adicionar e remover interesse por teclado; o chip removido é anunciado; "Perfil salvo" é lido. |
| Perfil de outro usuário (`/usuarios/:id`) | Conteúdo somente leitura, sem botões de edição no caminho do `Tab`. |
| Moderação (`/moderacao/denuncias`) | Filtros anunciam qual está ativo; ao ocultar, restaurar ou descartar, o resultado é anunciado e o foco não se perde. |

## Telas novas

Ao criar uma tela:

1. Dê um `title:` à rota em `app.routes.ts`, só com o nome da tela; o sufixo " — UniCatólica" vem do `TituloStrategy`.
2. Acrescente um teste em `frontend/e2e/acessibilidade.spec.ts` que abra a tela em cada estado (vazio, com erro, com conteúdo), confira o título com `toHaveTitle` e chame `esperarSemViolacoes(page)`.
3. Acrescente uma linha na tabela acima com o que for específico dela.
