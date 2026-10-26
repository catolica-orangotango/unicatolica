---
target: Comunidade (detalhe + feed)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/home/taques/Projetos/unicatolica/frontend/src/app/features/comunidades/comunidade-detalhe/comunidade-detalhe.html"
target_fingerprint: "sha256:14fa3b36fbe07964607bd8bebcbcbc372b13eca183153c60d506c44f9647328e"
target_path: /home/taques/Projetos/unicatolica/frontend/src/app/features/comunidades/comunidade-detalhe/comunidade-detalhe.html
timestamp: 2026-10-24T20-06-18Z
slug: omunidade-detalhe-comunidade-detalhe-html-3467a605
---
# Critique: Comunidade (detalhe + feed)
Method: dual-agent. 21/40. Heurísticas: 1=2, 2=3, 3=2, 4=2, 5=2, 6=3, 7=1, 8=2, 9=2, 10=2.
Especificidade: template de fórum; o específico está só na copy (aviso RF27.1, anonimato da denúncia).
Detector: CLI 0; navegador undersized-ui-text no h2 'Postagens' (feed-comunidade.html:45), 10.5px.
## Problemas prioritários
- [P1] .detalhe__acao absolute (comunidade-detalhe.scss:56-60) sobrepõe o nome em 360px. /impeccable adapt
- [P1] Faixa bordô viola a Trace Rule e deixa o foco de Participar invisível (1:1). /impeccable quieter
- [P1] Participar vira Sair no mesmo lugar, sem confirmação; membro de comunidade aberta não vê 'Você é membro'. /impeccable polish
- [P1] Moderador não vê ocultos nem Restaurar no feed (contra ux-experiencia.md). /impeccable shape
- [P2] Descrição e membros nunca exibidos; data criada em um dia atrasada por fuso. /impeccable onboard
## Personas
Julia: sem membros nem descrição. Rafael: nada de moderação no feed. Sam: 3 'Denunciar' iguais, foco perdido, contador anuncia a cada tecla. Casey: sobreposição, badges e 'há 6 h' quebrando.
## Menores
Dois laranjas com denúncia aberta; 'Passou 10 do limite'; badge da comunidade repetido em cada post; gradiente no avatar.
