# Documentação do UniCatólica

Comece por [`como-funciona.md`](como-funciona.md). Ele explica o caminho de uma requisição, onde cada coisa mora no código e onde colocar código novo.

## Documentação viva

Estes documentos são mantidos atualizados junto com o código.

| Documento | Para quê |
|---|---|
| [`como-funciona.md`](como-funciona.md) | Guia de entrada: fluxo de requisição, estrutura de pastas, regras entre módulos, checklist de nova funcionalidade |
| [`arquitetura.md`](arquitetura.md) | Decisões de arquitetura AD-1 a AD-11, stack, convenções e diagramas (o "architecture spine") |
| [`dividas-tecnicas.md`](dividas-tecnicas.md) | Problemas conhecidos ainda sem história ou PR |
| [`decisoes/`](decisoes/) | Uma decisão por arquivo, a partir de agora. Decisões novas ou que alteram uma AD entram aqui |
| [`../openapi.yaml`](../openapi.yaml) | Contrato REST, fonte de verdade entre frontend e backend |
| [`../frontend/src/styles/README.md`](../frontend/src/styles/README.md) | Tokens de design Campus Clean e a regra de não fixar valores no SCSS |

## Produto

Definem o que o sistema deve fazer. Mudam pouco.

| Documento | Para quê |
|---|---|
| [`produto/contexto-pacext.md`](produto/contexto-pacext.md) | Relatório do PAC Extensionista: 80 requisitos funcionais (RF), 9 não funcionais (RNF), riscos, C4 |
| [`produto/prd.md`](produto/prd.md) | PRD: visão, personas, jornadas, métricas de sucesso |
| [`produto/ux-experiencia.md`](produto/ux-experiencia.md) | Fluxos de UX e padrões de interação |
| [`produto/ux-design.md`](produto/ux-design.md) | Sistema de design Campus Clean |
| [`produto/artefatos-visuais.md`](produto/artefatos-visuais.md) | Links para protótipos e decks interativos |

## Histórico

`_bmad-output/` guarda o registro do planejamento e da implementação: PRD, UX, arquitetura e revisões originais, épicos e histórias (`planning-artifacts/epics.md`), specs e retrospectivas (`implementation-artifacts/`), e relatórios antigos (`implementation-artifacts/historico/`). Esses arquivos contam como se chegou até aqui e não são atualizados. Para saber como o sistema é hoje, use a documentação viva acima.

`_bmad-output/planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` é o snapshot original de 2026-08-22. A versão mantida é [`arquitetura.md`](arquitetura.md).

### Caminhos antigos

Os arquivos de histórico citam caminhos que mudaram em 2026-09-24:

| Caminho antigo | Caminho novo |
|---|---|
| `docs/unicatolica-architecture-spine.md` | `docs/arquitetura.md` |
| `docs/unicatolica-pacext-contexto.md` | `docs/produto/contexto-pacext.md` |
| `docs/unicatolica-pacext-prd.md` | `docs/produto/prd.md` |
| `docs/unicatolica-experience.md` | `docs/produto/ux-experiencia.md` |
| `docs/unicatolica-design.md` | `docs/produto/ux-design.md` |
| `docs/unicatolica-artefatos.md` | `docs/produto/artefatos-visuais.md` |
| `docs/modelo-epico-2-comunidades.md` | `docs/decisoes/2026-08-modelo-epico-2-comunidades.md` |
| `docs/arquitetura-camadas-explicacao.md` | `_bmad-output/implementation-artifacts/historico/` (conteúdo absorvido por `como-funciona.md`) |
| `docs/relatorio-status-projeto.md` | `_bmad-output/implementation-artifacts/historico/` |
| `docs/validacao-*.md` | `_bmad-output/implementation-artifacts/historico/` |
