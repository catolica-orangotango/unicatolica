---
target: Descobrir comunidades
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/home/taques/Projetos/unicatolica/frontend/src/app/features/comunidades/comunidades-lista/comunidades-lista.html"
target_fingerprint: "sha256:6cb3e3a815352053a833e2b181dcf8144cd3db76422606ee44c63595655e5709"
target_path: /home/taques/Projetos/unicatolica/frontend/src/app/features/comunidades/comunidades-lista/comunidades-lista.html
timestamp: 2026-10-24T20-06-18Z
slug: comunidades-lista-comunidades-lista-html-0e1410e3
---
# Critique: Descobrir comunidades
Method: dual-agent. 20/40. Heurísticas: 1=2, 2=3, 3=2, 4=2, 5=2, 6=2, 7=2, 8=2, 9=1, 10=2.
Especificidade: grade + busca + Participar intercambiável; quebra a North Star com 7 laranjas.
Detector: CLI 0; navegador 2 straggler verdadeiros (comunidades-lista.scss:88), 2 text-occlusion falsos (rótulo do overlay).
## Problemas prioritários
- [P1] Foco cai no body ao entrar; filtro não anunciado; 5 'Participar' iguais. /impeccable harden
- [P1] One Orange Rule quebrada 7x; nada diferencia os cards. /impeccable quieter
- [P1] Comunidade de curso sem vínculo é card morto (RF27.1 não explicada). /impeccable clarify
- [P1] Busca sensível a acento (ComunidadeRepository.java:62-68); vazio fala em filtro sem filtro; erro sem retry. /impeccable harden
- [P2] Linha de filtros não cabe em 360px. /impeccable adapt
## Personas
Julia: 'atletica' sem acento não acha nada; curso igual aos outros; Sair a um toque. Jordan: curso vs aberta nunca explicado. Sam: sem lista semântica nem anúncio. Casey: filtros espremidos, 28px.
## Menores
Select cinza nativo; placeholder fora do token; Sair em tamanho errado; criar comunidade como button routerLink.
