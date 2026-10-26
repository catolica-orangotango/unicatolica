---
target: Fila de denúncias
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/taques/Projetos/unicatolica/frontend/src/app/features/moderacao/fila-denuncias/fila-denuncias.html"
target_fingerprint: "sha256:ec355914bbe1b48d33fd04918fde601a4ec9137df9e94c4183a88a7b2e363706"
target_path: /home/taques/Projetos/unicatolica/frontend/src/app/features/moderacao/fila-denuncias/fila-denuncias.html
timestamp: 2026-10-24T20-06-18Z
slug: eracao-fila-denuncias-fila-denuncias-html-1c1b78e6
---
# Critique: Fila de denúncias
Method: dual-agent. 21/40. Heurísticas: 1=2, 2=3, 3=2, 4=3, 5=2, 6=2, 7=1, 8=3, 9=2, 10=1.
Especificidade: lista + painel genérico; vocabulário e RF77.1 certos, mas sem contexto de comunidade nem escalonamento.
Detector: CLI 0; navegador 3 undersized-ui-text nos motivos (fila-denuncias.html:40), 1 nested-cards (analise-denuncia.scss:30-35).
## Problemas prioritários
- [P0] Sem Escalonar e sem Remover (fila-denuncias.ts:22); UJ-2 não fecha. /impeccable shape
- [P1] Resolvidas/Descartadas não mostram decisão nem motivo enviado. /impeccable clarify
- [P1] Teclado quebra a cada decisão; Ocultar desabilitado fora da tabulação; sem skip link. /impeccable harden
- [P1] No celular o painel fica após a lista, ações fora da tela. /impeccable adapt
- [P2] Item sem autor nem comunidade; horários sem rótulo. /impeccable clarify
## Personas
Rafael: sem saída para conflito de interesse; sem resumo do dia. Alex: sem atalhos nem lote; foco perdido. Sam: anúncio ausente, Ocultar inalcançável. Casey: aba cortada, 28px.
## Menores
Erro sem retry; travessão na copy (analise-denuncia.html:59); descarte sem atrito vs ocultar com atrito.
