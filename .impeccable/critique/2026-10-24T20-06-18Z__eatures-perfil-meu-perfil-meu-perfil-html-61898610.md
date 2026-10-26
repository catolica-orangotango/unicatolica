---
target: Perfil (próprio e de terceiro)
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/home/taques/Projetos/unicatolica/frontend/src/app/features/perfil/meu-perfil/meu-perfil.html"
target_fingerprint: "sha256:fecc2a96495ff3141d16e89c62fdeed2ed1b86be130c2ab4859db3e62195dac4"
target_path: /home/taques/Projetos/unicatolica/frontend/src/app/features/perfil/meu-perfil/meu-perfil.html
timestamp: 2026-10-24T20-06-18Z
slug: eatures-perfil-meu-perfil-meu-perfil-html-61898610
---
# Critique: Perfil (próprio e de terceiro)
Method: dual-agent. 22/40. Heurísticas: 1=2, 2=3, 3=2, 4=2, 5=1, 6=3, 7=2, 8=3, 9=2, 10=2.
Especificidade: cartão de configurações genérico; não ajuda a reconhecer nem confiar num veterano (UJ-1 passo 5).
Detector: CLI 0; navegador 3 undersized-ui-text nos dt (perfil-cartao.html:8,10,12).
## Problemas prioritários
- [P1] salvar() (meu-perfil.ts:129-138) ignora o interesse digitado e mostra 'Perfil salvo'. /impeccable harden
- [P1] Trocar curso troca a comunidade em silêncio. /impeccable clarify
- [P1] Foco cai no body ao editar/salvar/cancelar; erros não anunciados. /impeccable harden
- [P1] Perfil de terceiro sem papel, comunidades nem volta ao post; título genérico. /impeccable shape
- [P2] Estado vazio de interesses não convida a agir; intro não fala de interesses. /impeccable onboard
## Personas
Julia: interesse perdido; promessa de busca que não existe. Rafael: sem papel de moderador visível. Sam: foco perdido; anel bordô parecido com borda de erro. Casey: dl max-content espreme valores; nome longo em 5 linhas.
## Menores
Editar perfil laranja numa tela de leitura; erro sem retry; 'x' do chip com 20px.
