import { expect, test } from '@playwright/test';
import { esperarSemViolacoes } from './support/acessibilidade';
import { LogAuditoriaMock, mockAuditoria, mockFeedOk } from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * Tela "Logs de auditoria" de /admin (KAN-90): filtros sem botão, estado na URL, paginação e
 * erros. Sem backend, com JWT de ADMINISTRADOR plantado; o mock exige o header Authorization.
 * As regras do servidor (403, 422, índices) são testadas no backend.
 */

const ADMIN = { id: 1, nome: 'Administrador Teste', email: 'admin.teste@catolicasc.edu.br' };

function logs(): LogAuditoriaMock[] {
  return [
    {
      id: 1,
      // 02:30Z de 10/03 = 23:30 de 09/03 em Brasília.
      criadoEm: '2026-03-10T02:30:00Z',
      autor: ADMIN,
      modulo: 'identidade',
      acao: 'PERFIL_ALTERADO',
      entidadeAfetada: 'Usuario',
      entidadeId: 7,
      detalhes: 'ALUNO -> MODERADOR',
    },
    {
      id: 2,
      criadoEm: '2026-03-11T13:00:00Z',
      autor: null,
      modulo: 'comunidades',
      acao: 'COMUNIDADE_CURSO_RENOMEADA',
      entidadeAfetada: 'Comunidade',
      entidadeId: 3,
      detalhes: 'nome: Direito -> Direito Civil',
    },
    {
      id: 3,
      criadoEm: '2026-03-12T13:00:00Z',
      autor: { id: 99, nome: null, email: null },
      modulo: 'identidade',
      acao: 'LOGIN',
      entidadeAfetada: null,
      entidadeId: null,
      detalhes: null,
    },
  ];
}

function muitosLogs(total: number): LogAuditoriaMock[] {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    criadoEm: new Date(Date.UTC(2026, 2, 1, 12, 0, i)).toISOString(),
    autor: ADMIN,
    modulo: 'identidade',
    acao: 'LOGIN',
    entidadeAfetada: null,
    entidadeId: null,
    detalhes: `login ${i + 1}`,
  }));
}

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
  await plantarToken(page, ['ADMINISTRADOR']);
});

test('pelo painel, abre os logs mais recentes primeiro, com horário de Brasília e autor', async ({ page }) => {
  await mockAuditoria(page, logs());
  await page.goto('/admin');

  await page.getByRole('link', { name: 'Logs de auditoria' }).click();

  await expect(page).toHaveURL(/\/admin\/auditoria$/);
  await expect(page).toHaveTitle('Logs de auditoria — UniCatólica');
  await expect(page.getByRole('heading', { level: 1, name: 'Logs de auditoria' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: '3 registros encontrados' })).toBeVisible();
  const linhas = page.locator('tbody tr');
  await expect(linhas).toHaveCount(3);
  await expect(linhas.nth(0)).toContainText('LOGIN');
  await expect(linhas.nth(0)).toContainText('Usuário #99');
  await expect(linhas.nth(1)).toContainText('Sistema');
  await expect(linhas.nth(2)).toContainText('09/03/2026 23:30:00');
  await expect(linhas.nth(2)).toContainText(ADMIN.nome);
  await expect(linhas.nth(2)).toContainText(ADMIN.email);
  await expect(linhas.nth(2)).toContainText('Usuario #7');
  await esperarSemViolacoes(page);
});

test('filtra por módulo e ação, deixa o estado na URL e recarregar mantém a consulta', async ({ page }) => {
  await mockAuditoria(page, logs());
  await page.goto('/admin/auditoria');
  await expect(page.locator('tbody tr')).toHaveCount(3);

  await page.getByLabel('Módulo', { exact: true }).selectOption('identidade');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('Ação', { exact: true }).selectOption('PERFIL_ALTERADO');
  await expect(page.locator('tbody tr')).toHaveCount(1);

  await expect(page).toHaveURL(/\/admin\/auditoria\?modulo=identidade&acao=PERFIL_ALTERADO$/);
  await page.reload();
  await expect(page.getByLabel('Módulo', { exact: true })).toHaveValue('identidade');
  await expect(page.getByLabel('Ação', { exact: true })).toHaveValue('PERFIL_ALTERADO');
  await expect(page.locator('tbody tr')).toHaveCount(1);

  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/auditoria\?modulo=identidade$/);
  await expect(page.locator('tbody tr')).toHaveCount(2);
});

test('a lista de ações mostra só as do módulo escolhido', async ({ page }) => {
  await mockAuditoria(page, logs());
  await page.goto('/admin/auditoria');
  await expect(page.locator('tbody tr')).toHaveCount(3);

  await page.getByLabel('Módulo', { exact: true }).selectOption('comunidades');

  const acoes = page.getByLabel('Ação', { exact: true }).locator('option');
  await expect(acoes).toHaveText(['Todas as ações', 'COMUNIDADE_CURSO_RENOMEADA']);
});

test('detalhes filtra a partir de 3 letras, com espera, e avisa antes disso', async ({ page }) => {
  const consultas = await mockAuditoria(page, logs());
  await page.goto('/admin/auditoria');
  await expect(page.locator('tbody tr')).toHaveCount(3);

  await page.getByLabel('Detalhes contêm').fill('MO');
  await expect(page.getByText('Digite ao menos 3 letras.')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/admin\/auditoria$/);

  await page.getByLabel('Detalhes contêm').fill('moderador');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page).toHaveURL(/detalhes=moderador$/);
  expect(consultas.filter((q) => q.get('detalhes') === 'moderador')).toHaveLength(1);
});

test('de depois de até mostra o erro no campo', async ({ page }) => {
  await mockAuditoria(page, logs());
  await page.goto('/admin/auditoria');
  await expect(page.locator('tbody tr')).toHaveCount(3);

  await page.getByLabel('De', { exact: true }).fill('2026-03-12');
  await page.getByLabel('Até', { exact: true }).fill('2026-03-10');

  await expect(page.getByText('A data inicial não pode ser depois da data final.')).toBeVisible();
  await expect(page.getByLabel('Até', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await esperarSemViolacoes(page);
});

test('intervalo de dias é inclusivo em horário de Brasília', async ({ page }) => {
  await mockAuditoria(page, logs());
  await page.goto('/admin/auditoria?de=2026-03-09&ate=2026-03-09');

  // 02:30Z de 10/03 ainda é dia 09 em Brasília.
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody tr')).toContainText('PERFIL_ALTERADO');
});

test('pagina de 20 em 20 e "Limpar filtros" volta para a lista completa', async ({ page }) => {
  await mockAuditoria(page, muitosLogs(45));
  await page.goto('/admin/auditoria');

  await expect(page.locator('tbody tr')).toHaveCount(20);
  await expect(page.getByText('Página 1 de 3')).toBeVisible();
  await expect(page.getByRole('button', { name: '← Anterior' })).toBeDisabled();

  await page.getByRole('button', { name: 'Próxima →' }).click();
  await expect(page).toHaveURL(/pagina=2$/);
  await expect(page.getByText('Página 2 de 3')).toBeVisible();
  await page.getByRole('button', { name: 'Próxima →' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Próxima →' })).toBeDisabled();

  await page.getByLabel('Módulo', { exact: true }).selectOption('identidade');
  await expect(page).toHaveURL(/\/admin\/auditoria\?modulo=identidade$/);
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL(/\/admin\/auditoria$/);
  await expect(page.getByLabel('Módulo', { exact: true })).toHaveValue('');
});

test('nenhum log para os filtros oferece "Limpar filtros"', async ({ page }) => {
  await mockAuditoria(page, logs());
  await page.goto('/admin/auditoria?modulo=identidade&acao=COMUNIDADE_CURSO_RENOMEADA');

  await expect(page.getByText('Nenhum log para esses filtros')).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Limpar filtros' }).last().click();
  await expect(page.locator('tbody tr')).toHaveCount(3);
});

test('erro de carga mostra "Tentar de novo"', async ({ page }) => {
  let falhar = true;
  await mockAuditoria(page, logs());
  await page.route(
    (url) => url.port === '8080' && url.pathname === '/admin/auditoria',
    (route) =>
      falhar
        ? route.fulfill({
            status: 500,
            headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
            body: JSON.stringify({ error: { code: 'ERRO_INTERNO', message: 'Erro.', details: null } }),
          })
        : route.fallback(),
  );
  await page.goto('/admin/auditoria');

  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar os logs');
  await esperarSemViolacoes(page);

  falhar = false;
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(3);
});

test('aluno que digita /admin/auditoria volta para o Início', async ({ page }) => {
  await plantarToken(page, ['ALUNO']);
  await page.goto('/admin/auditoria');

  await expect(page).toHaveURL(/\/feed$/);
});

test('moderador que digita /admin/auditoria volta para o Início', async ({ page }) => {
  await plantarToken(page, ['MODERADOR']);
  await page.goto('/admin/auditoria');

  await expect(page).toHaveURL(/\/feed$/);
});
