---
target: Início (/feed)
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/taques/Projetos/unicatolica/frontend/src/app/features/feed/feed.html"
target_fingerprint: "sha256:0572e09399dc5648cad41423c574482b033c85ac91d55c23a960bffd460cc145"
target_path: /home/taques/Projetos/unicatolica/frontend/src/app/features/feed/feed.html
timestamp: 2026-10-24T19-51-25Z
slug: frontend-src-app-features-feed-feed-html
---
# Critique: Início (/feed)

Method: dual-agent (A: revisão de design, B: detector + navegador). Estado avaliado: Campus Clean atual, base para KAN-84. Tela aberta logada como Julia com API mockada, 1440px e 360px, estados normal/vazio/erro/carregando, e como moderador.

## Design Health Score: 20/40 (Aceitável, limite de baixo)
1 Visibilidade do status 2: sidebar diz "Você ainda não faz parte de nenhuma" durante o carregamento; após Participar o card some e o foco cai no body.
2 Mundo real 2: "Publicações chegam em breve" é falso; "Carregando sua Home" vs "Início".
3 Controle 2: entrar não tem desfazer; card some.
4 Consistência 2: dois avatares; três rótulos para o mesmo destino.
5 Prevenção 3: clique duplo protegido.
6 Reconhecimento 2: card só com nome; sem descrição nem membros.
7 Eficiência 1: busca inerte, sem atalhos, moderador vê a mesma tela.
8 Estética 3: calma, mas badge "Aberta" x6 e seis CTAs laranja.
9 Recuperação de erro 1: qualquer falha apaga a página, sem tentar de novo.
10 Ajuda 2: único guia é o aviso desatualizado.

## Especificidade
Genérica: grade 3x2 de cards idênticos intercambiável com qualquer produto; a promessa (você já pertence) só aparece num toast. Composição planejada (feed, avisos, enquete da universidade) ausente.
Detector: CLI 0 achados; navegador 1 achado verdadeiro undersized-ui-text no h2 "Descubra comunidades" (10.5px, feed.html:23, feed.scss:80-86), causado pelo token --uc-font-size-label-caps.

## Problemas prioritários
- [P0] Tela não cabe em 360px: sidebar de 220px sem media query, conteúdo de 484px (shell.scss:18). Fix: barra inferior ou gaveta abaixo de ~768px. /impeccable adapt
- [P1] Início não cumpre UJ-1: sem posts nem comunidade do curso; "em breve" falso (feed.html:17-20, feed.ts:19-22). Fix: abrir com a comunidade do curso e posts reais, descoberta secundária. /impeccable shape
- [P1] Carregamento e erro enganam: falso vazio na sidebar (shell.html:101-104), erro sem retry, forkJoin tudo-ou-nada (feed.ts:61-76). Fix: esqueleto, Tentar de novo, render parcial. /impeccable harden
- [P1] Itens inertes iguais aos ativos (#6E6E68 vs #6B6B66, shell.ts:36-41, shell.scss:95-98). Fix: esconder ou agrupar em "Em breve". /impeccable clarify
- [P2] Participar sem retorno e perde foco (feed.ts:117-119). Fix: manter card, trocar por indicador Membro + Abrir, foco preservado. /impeccable polish

## Persona red flags
Julia: falso vazio, "em breve", curso só em 12px e toast, cards sem descrição. Rafael: Início idêntico ao do aluno, sem resumo da fila, 10 itens na sidebar. Jordan: itens inertes clicáveis, rótulo "Suas comunidades" parece link, avatar vazio. Sam: sem h1, foco perdido, Participar sem nome da comunidade no nome acessível, role=menu indevido, 10.5px. Casey: rolagem horizontal, alvos de ~28px, toast cobre card, navegação no topo.

## Observações menores
500px vazios à direita em 1440; CSS morto feed.scss:93-107; pontos de comunidade aberta quase invisíveis; nomes longos quebram em 4 linhas; "Ver todas" pouco visível; avatares inconsistentes.

## Perguntas
Sem o toast, algo diz à Julia que ela pertence? Por que descoberta é o conteúdo principal? O Início do Rafael deveria começar pela fila? Sidebar de 220px é a navegação certa para uso no celular?
