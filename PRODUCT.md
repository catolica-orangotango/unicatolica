# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dois usuários com o mesmo peso para as decisões de produto:

- **Aluno (persona Julia, UJ-1 do PRD):** estudante do Campus Joinville da CatólicaSC, com o calouro como caso mais exigente. Chega sem conhecer ninguém, hoje depende de grupos de WhatsApp fragmentados e da sorte de achar veteranos. O trabalho dele é se situar no curso, achar dicas de disciplinas e professores, materiais, avisos e enquetes, e ampliar a rede para outros cursos.
- **Moderador (persona Rafael, UJ-2 do PRD):** representante de turma que modera voluntariamente, como rotina diária. O trabalho dele é tratar denúncias com justiça, sem ver quem denunciou, e escalonar para um moderador neutro quando tem vínculo com os envolvidos.

Público secundário: o **administrador da plataforma**, papel de back-office (pré-criar comunidades de curso, publicar avisos institucionais recebidos da coordenação). Sem jornada própria no MVP.

Escopo do MVP: só alunos de Engenharia de Software. Os demais cursos do Campus Joinville vêm logo depois do lançamento; o Campus Jaraguá do Sul fica para uma fase futura. Não existe acesso público nem de visitante: o cadastro exige e-mail institucional e idade mínima de 18 anos.

## Product Purpose

A UniCatólica é a rede social acadêmica do Campus Joinville (alias técnico PACEXT). Ela reúne em um ambiente só o que hoje está espalhado: comunidade do curso, dicas de veteranos, materiais de estudo, enquetes que substituem a pesquisa de campo repassada por WhatsApp, avisos institucionais e a rede de contatos entre cursos.

Nasce como projeto de PAC Extensionista (Engenharia de Software, 5º semestre, orientador Prof. Edson Vaz Lopes). Sucesso nesta fase tem dois juízes: a avaliação acadêmica do PAC e um piloto real com alunos de Engenharia de Software usando a plataforma. Requisitos não funcionais que definem "funcionar": usuário novo conclui login, entrada em comunidade e criação de postagem sem treinamento (RNF01); desktop e navegador mobile (RNF02); p95 até 2 s nas operações críticas (RNF03).

## Positioning

O que um grupo de WhatsApp ou o AVA não conseguem oferecer:

- **Comunidade de curso pronta:** o auto-join coloca o aluno na comunidade do curso dele no primeiro login, sem procurar nem pedir convite.
- **Rede entre cursos:** comunidades abertas por interesse (ex.: Atlética de Engenharia) ligam alunos de áreas diferentes. O feed de comunidade de outro curso é visível, mas só membros interagem.
- **Ambiente oficial e moderado:** só e-mail institucional, moderação por representantes de turma com escalonamento para moderador neutro, autor sempre informado do motivo sem saber quem denunciou, avisos vindos da coordenação.
- **Informação que não se perde:** enquetes, materiais e dicas ficam organizados e encontráveis, em vez de rolar para fora da tela de um chat.

## Operating Context

- Ponto de entrada previsto: menu "Já sou Aluno" do site institucional (catolicasc.org.br), ao lado de AVA, Portal do Aluno e Webmail. Não há página de entrada própria do produto.
- Uso do aluno: sessões curtas e recorrentes, no desktop e no celular pelo navegador, entre aulas e em casa.
- Uso do moderador: rotina diária de fila de denúncias, ocultar, restaurar, remover, escalonar.
- Uso do administrador: painel `/admin` para comunidades de curso e avisos institucionais. Relatórios estão fora de escopo.
- O time de 4 pessoas usa Jira (projeto KAN) e PRs com CI; o orientador acompanha pela documentação em `docs/`.

## Capabilities and Constraints

- 12 módulos funcionais e 80 requisitos (RF01 a RF82 com subitens) em `docs/produto/contexto-pacext.md` e `docs/produto/prd.md`; o vocabulário do Glossário do PRD é usado ao pé da letra (comunidade de curso, comunidade aberta, auto-join, enquete da universidade, ocultar vs. remover, aviso institucional).
- Já implementado: Identidade (cadastro, confirmação de e-mail, login, logout), Comunidades, Publicações (postagem e feed), Perfil, Moderação (denunciar, fila, ocultar/restaurar/descartar) e o painel admin. Os demais módulos (discussões, enquetes, busca, notificações, mensagens, materiais, filtro) ainda não existem.
- Regras de enquete são de produto, não de tela: voto irreversível, resultado só depois de votar e com no mínimo 5 votos, criador vê só o agregado, 2 a 5 opções.
- Ocultar é reversível e remover é definitivo; as mensagens para o autor precisam distinguir as duas.
- Stack e arquitetura já decididas (Angular SPA, Quarkus, Postgres): ver `AGENTS.md` e `docs/arquitetura.md`.
- Em aberto: segundo nível de escalonamento quando o moderador neutro também tem vínculo com os envolvidos (Open Questions do PRD).

## Brand Commitments

- Nome do produto: **UniCatólica**. Instituição: Centro Universitário Católica de Santa Catarina (CatólicaSC), Campus Joinville.
- Voz (de `docs/produto/ux-experiencia.md`): direta, de igual para igual, tratando por "você", sem jargão corporativo. Erros explicam o que houve e o que fazer, sem culpar o usuário. Estados vazios convidam a agir, sem forçar humor.
- Interface, campos e copy em português do Brasil.
- Identidade visual vigente (Campus Clean) documentada em `DESIGN.md`; não é repetida aqui.

## Evidence on Hand

- Documentação de produto: `docs/produto/contexto-pacext.md` (relatório final do PAC, validado com o orientador), `docs/produto/prd.md`, `docs/produto/ux-experiencia.md`.
- Mockups do planejamento em `_bmad-output/planning-artifacts/ux-designs/ux-unicatolica-2026-08-17/mockups/` (não versionados) e artefatos publicados listados em `docs/produto/artefatos-visuais.md`.
- Ainda não existem: depoimentos de alunos, métricas de uso, números do piloto, logos ou fotos oficiais no repositório. Nenhum trabalho futuro deve inventá-los.

## Product Principles

1. **Pertencer sem configurar.** A primeira sessão já entrega uma comunidade relevante; o aluno nunca começa num vazio.
2. **Justiça visível na moderação.** Quem é moderado sabe o motivo; quem denuncia fica protegido; quem tem vínculo pode se afastar da decisão.
3. **Oficial sem ser burocrático.** É um ambiente institucional, mas fala como colega, não como secretaria.
4. **Informação que dura.** O que um aluno compartilha deve continuar encontrável semanas depois.
5. **Atravessar cursos.** O produto favorece o contato entre áreas, não só dentro da própria turma.

## Accessibility & Inclusion

- WCAG 2.2 nível AA (RNF06): texto com contraste mínimo de 4.5:1, verificado por axe em `frontend/e2e/acessibilidade.spec.ts` (violação serious/critical quebra o CI); teclado, foco e leitor de tela seguem `docs/acessibilidade-checklist.md`.
- Privacidade conforme LGPD (RNF05): dados pessoais limitados à finalidade, denunciante nunca exposto, criador de enquete nunca vê voto individual.
