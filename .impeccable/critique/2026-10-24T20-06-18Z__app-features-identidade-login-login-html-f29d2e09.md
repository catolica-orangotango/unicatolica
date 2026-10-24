---
target: Login / Cadastro / Confirmar e-mail
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/taques/Projetos/unicatolica/frontend/src/app/features/identidade/login/login.html"
target_fingerprint: "sha256:1d622473574693abc3e68e5b78ee754dceeb677a93a3008294e6aa55b938c5fd"
target_path: /home/taques/Projetos/unicatolica/frontend/src/app/features/identidade/login/login.html
timestamp: 2026-10-24T20-06-18Z
slug: app-features-identidade-login-login-html-f29d2e09
---
# Critique: Login / Cadastro / Confirmar e-mail
Method: dual-agent. 21/40. Heurísticas: 1=2, 2=3, 3=2, 4=2, 5=2, 6=3, 7=2, 8=3, 9=1, 10=1.
Especificidade: genérica (card de login de qualquer SaaS); é a página de entrada de fato e não diz o que é o produto.
Detector: CLI 0; navegador 0.
## Problemas prioritários
- [P0] login.ts:53-56 ignora EMAIL_NAO_CONFIRMADO e mostra 'E-mail ou senha inválidos.' (RF01.2). Fix: ramificar por error.code e oferecer Reenviar confirmação. /impeccable clarify
- [P1] Becos sem saída: cadastro sem link para entrar; Verifique sem link; 'Esqueceu a senha?' sem fluxo; token expirado leva ao cadastro. /impeccable clarify
- [P1] Login vazio não mostra erro nem aria-invalid. /impeccable harden
- [P1] Domínio e 18+ só validados no servidor; erro em banner no topo, foco no body. /impeccable harden
- [P2] Primeira tela não apresenta o produto nem a instituição. /impeccable shape
## Personas
Jordan: 'senha inválida' com e-mail não confirmado. Sam: login vazio silencioso, foco perdido. Casey: botões de 28px, banner de erro no topo. Julia: nada liga ao site institucional nem promete o auto-join.
## Menores
Link secundário laranja em confirmar-email.scss:36; dl Nome/Curso/Status redundante; 'Login' vs 'Entrar'.
