---
version: 1
slug: "frontend-src-app-features-feed-feed-html"
primary_target: "frontend/src/app/features/feed/feed.html"
related_targets: []
---

# Início (/feed)

Escopo: Início do aluno e Início próprio do moderador. Modo: Operate. Etapa atual: mockup da KAN-84 (direção aprovada antes do código; implementação vira tickets próprios).

Público e tarefa: Julia (caloura) abre entre aulas, muitas vezes no celular, para ver o que a turma postou, o que tem prazo e entrar em comunidades. Rafael (moderador) tem Início próprio que começa pela fila de denúncias, com o feed a um clique.

Restrições vindas das críticas de 2026-10-24 (.impeccable/critique/): navegação mobile própria, nada rola para o lado em 360px; foco previsível após cada ação; erro sempre com "Tentar de novo"; alvos de 44px no mobile; nada abaixo de 12px; título de seção sem caixa-alta; uma ação primária por tela; itens inertes agrupados em "Em breve"; avisos e enquetes dependem de backend e ficam marcados como tal no mockup.

Histórico: a evolução do Campus Clean foi descartada (24/10/2026) por pedido de redesign. Dois sorteios de direção (Cartaz da Semana Acadêmica, Sinalização do campus, Caderneta da turma, Calendário acadêmico e catálogo) foram recusados: "tudo muito quadrado", falta cara de app moderno. O usuário escolheu o padrão da categoria com referências Threads/Bluesky e Notion/Linear.

## Direction contract
THESIS: Uma rede social leve e precisa onde a turma conversa numa coluna só, no padrão Threads/Bluesky com o acabamento de Linear. Recusa objetos impressos, cantos retos e o layout encostado à esquerda com sobra à direita.
OWN-WORLD: Fundo branco, superfícies #F7F7F8, bordas de 1px #ECECEE, tinta #18181B, secundário #66666E, bordô #7A1F2B como única cor de marca e de ação (botão pílula, aba ativa, foco, ponto de novo) com tint #F7ECEE. Inter, corpo 15px, nomes 600. Raio 12 a 16px em superfícies, pílula em botões, avatares redondos, ícones de traço 1.75px.
STORY: A aluna sente que abriu um app de verdade, vê que já está na turma de Engenharia de Software, lê o que é novo e sabe o que vence nesta semana.
FIRST VIEWPORT: Três colunas centradas como grupo (nav 248, feed 600, lateral 320). Nav com marca, ícone e rótulo, comunidades e "Em breve". Feed: cabeçalho da comunidade (avatar ES, nome 20px, rostos e 214 membros), abas Publicações e Fixados, compositor estilo Threads com o único botão bordô, posts sem caixa separados por filete. Lateral: card "Esta semana" com datas e "Outras comunidades".
FORM: padrão da categoria executado a fundo (canon, após dois sorteios); seed:687219939b6b61b2. Assinatura: divisor "Novas desde sua última visita" no feed, com ponto bordô até ser visto.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
