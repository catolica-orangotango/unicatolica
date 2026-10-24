# Decisão: cursos mantidos pelo administrador e comunidade de curso ligada por id

- **Data:** 2026-10-19 (KAN-44, cumpre a Story 2.1)
- **Estado:** aceita
- **Arquitetura (AD-1 a AD-11):** sem alteração; uma exceção pontual de migration ao AD-3 (abaixo)

## Contexto

Desde 2026-09-30 o curso é a entidade `Curso` (Identidade), mas a lista era só o seed de 26 cursos, o auto-join casava curso e comunidade **pelo nome** e `usuario.curso` (texto) guardava uma cópia do nome. Renomear um curso soltaria o vínculo com a comunidade e deixaria a cópia velha.

## Decisão

- **Administração:** `POST /cursos`, `PUT /cursos/{id}` (renomear e ativar/desativar) e `GET /admin/cursos` (todos, com os inativos), só para o perfil `ADMINISTRADOR` (403 para os demais). `GET /cursos` continua público e só devolve ativos. Alterações vão para o `AuditoriaService` (`CURSO_CADASTRADO`, `CURSO_RENOMEADO`, `CURSO_ATIVADO`, `CURSO_DESATIVADO`).
- **Eventos de Identidade:** `CursoCadastrado` e `CursoRenomeado`. Comunidades escuta (observer síncrono, mesma transação) e cria/renomeia a comunidade de curso. Se o nome já é de outra comunidade, o observer devolve 409 `COMUNIDADE_NOME_EM_USO` e o cadastro ou a renomeação do curso é desfeito.
- **Vínculo por id:** `comunidade.curso_id` (sem FK, AD-3) liga a comunidade ao curso. `UsuarioCadastrado` e `CursoDoUsuarioAlterado` passam a carregar ids, e `AutoJoinCursoService.sincronizarCursoDoAluno` recebe ids. Renomear o curso mantém a comunidade e os membros.
- **Desativar curso** só o tira de `GET /cursos` e do cadastro. Quem já o tem continua com ele no perfil, e a comunidade não muda.
- **Coluna `usuario.curso` removida** (`identidade-010`). O nome vem de `curso.nome` (`Usuario.cursoNome`, `@Formula` somente leitura), então renomear vale para todos de uma vez.

## Migrations

- `comunidades-004-add-curso-id`: coluna e índice único parcial (um curso, no máximo uma comunidade).
- `identidade-009-vincula-comunidade-ao-curso`: preenche `curso_id` das 26 comunidades de seed casando o nome uma única vez.
- `identidade-010-drop-usuario-curso`.

**Exceção ao AD-3:** o `identidade-009` atualiza a tabela `comunidade`, de outro módulo. Está na pasta de Identidade porque o `includeAll` roda por ordem de caminho: num banco novo `comunidades/` roda antes de `identidade/`, e só no `identidade-009` as duas tabelas já existem. É migração de dados de uma vez só; depois dela o vínculo nasce sempre por evento.

## Consequências

- Nome de curso e nome de comunidade disputam o mesmo espaço (`comunidade.nome` é `unique`): não dá para cadastrar um curso cujo nome já é de uma comunidade aberta.
- Reativar um curso não recria nada: a comunidade nunca saiu.
