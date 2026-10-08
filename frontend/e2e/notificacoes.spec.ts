import { expect, test } from '@playwright/test';
import { mockCursosOk, mockFeedOk, mockMeuPerfil, mockNotificacoes, type NotificacaoMock } from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * Sininho de notificações da sidebar (Story 10.1/4.3, KAN-41). Regressão dos dois
 * defeitos da recusa de Teste em 08/10: painel cortado pelo overflow da sidebar
 * (DEFEITO 1) e badge que não atualiza depois de salvar o perfil (DEFEITO 2).
 */

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
});

test('o painel de notificações não é cortado pela sidebar, mesmo com texto longo (DEFEITO 1, Teste 08/10)', async ({
  page,
}) => {
  const notificacoes: NotificacaoMock[] = [
    {
      id: 1,
      tipo: 'PERFIL_INCOMPLETO',
      texto: 'Complete seu perfil para que seus interesses apareçam no feed e nas buscas da comunidade.',
      link: '/perfil',
      lida: false,
      criadoEm: '2026-10-08T00:00:00Z',
    },
  ];
  await mockNotificacoes(page, notificacoes);
  await plantarToken(page, ['ALUNO']);
  await page.goto('/feed');

  await page.getByRole('button', { name: /Notificações/ }).click();

  const painel = page.locator('#shell-notificacoes');
  await expect(painel).toBeVisible();

  const sidebar = page.locator('.shell__sidebar');
  const painelCaixa = await painel.boundingBox();
  const sidebarCaixa = await sidebar.boundingBox();
  expect(painelCaixa).not.toBeNull();
  expect(sidebarCaixa).not.toBeNull();

  // O painel não pode ultrapassar a borda direita da sidebar (o que causava o corte).
  expect(painelCaixa!.x + painelCaixa!.width).toBeLessThanOrEqual(sidebarCaixa!.x + sidebarCaixa!.width + 1);

  // A sidebar não pode precisar de scroll horizontal pra mostrar o painel inteiro.
  const temScrollHorizontal = await sidebar.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(temScrollHorizontal).toBe(false);

  await expect(page.getByText('Complete seu perfil para que seus interesses')).toBeVisible();
});

test('salvar o perfil atualiza o badge de notificações sem precisar reabrir o painel ou recarregar (DEFEITO 2, Teste 08/10)', async ({
  page,
}) => {
  await mockCursosOk(page);
  const notificacoes = await mockNotificacoes(page, [
    {
      id: 1,
      tipo: 'PERFIL_INCOMPLETO',
      texto: 'Complete seu perfil.',
      link: '/perfil',
      lida: false,
      criadoEm: '2026-10-08T00:00:00Z',
    },
  ]);
  await mockMeuPerfil(
    page,
    { usuarioId: 1, nome: 'Usuário Teste', curso: null, periodo: null, interesses: [] },
    { marcarLidaAoSalvar: { notificacoes, id: 1 } },
  );
  await plantarToken(page, ['ALUNO']);
  await page.goto('/feed');

  const badge = page.locator('.shell__nav-badge');
  await expect(badge).toHaveText('1');

  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await page.getByRole('menuitem', { name: 'Perfil' }).click();
  await expect(page).toHaveURL(/\/perfil$/);

  await page.getByLabel('Curso').selectOption({ label: 'Engenharia de Software' });
  await page.getByLabel('Período').selectOption({ label: '3º semestre' });
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Perfil salvo')).toBeVisible();

  // Sem reabrir o painel nem recarregar: o badge já some sozinho.
  await expect(badge).toHaveCount(0);
});
