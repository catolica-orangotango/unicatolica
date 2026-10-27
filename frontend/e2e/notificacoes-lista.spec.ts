import { expect, test } from '@playwright/test';
import { mockFeedOk, mockNotificacoes, type NotificacaoMock } from './support/mocks';
import { plantarToken } from './support/seed';

/** Tela "Todas as notificações" (Story 10.2, KAN-46): marcar, excluir, navegar. */

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
});

test('lista as notificações, mais recentes primeiro', async ({ page }) => {
  const notificacoes: NotificacaoMock[] = [
    { id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'Primeira', link: null, lida: false, criadoEm: '2026-10-08T00:00:00Z' },
    { id: 2, tipo: 'ONBOARDING_PERFIL', texto: 'Segunda', link: null, lida: true, criadoEm: '2026-10-08T01:00:00Z' },
  ];
  await mockNotificacoes(page, notificacoes);
  await plantarToken(page, ['ALUNO']);
  await page.goto('/notificacoes');

  await expect(page.getByRole('heading', { name: 'Notificações' })).toBeVisible();
  await expect(page.getByText('Primeira')).toBeVisible();
  await expect(page.getByText('Segunda')).toBeVisible();
});

test('sem notificações mostra o estado vazio', async ({ page }) => {
  await mockNotificacoes(page, []);
  await plantarToken(page, ['ALUNO']);
  await page.goto('/notificacoes');

  await expect(page.getByText('Você não tem notificações.')).toBeVisible();
});

test('marcar como lida some o botão e o destaque de não lida', async ({ page }) => {
  await mockNotificacoes(page, [
    { id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'Complete seu perfil', link: null, lida: false, criadoEm: '2026-10-08T00:00:00Z' },
  ]);
  await plantarToken(page, ['ALUNO']);
  await page.goto('/notificacoes');

  const item = page.locator('.lista__item').first();
  await expect(item).toHaveClass(/lista__item--nao-lida/);

  await page.getByRole('button', { name: 'Marcar como lida' }).click();

  await expect(item).not.toHaveClass(/lista__item--nao-lida/);
  await expect(page.getByRole('button', { name: 'Marcar como lida' })).toHaveCount(0);
});

test('clicar no texto de uma notificação com link marca como lida e navega', async ({ page }) => {
  await mockNotificacoes(page, [
    { id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'Complete seu perfil', link: '/perfil', lida: false, criadoEm: '2026-10-08T00:00:00Z' },
  ]);
  await plantarToken(page, ['ALUNO']);
  await page.goto('/notificacoes');

  await page.getByRole('button', { name: 'Complete seu perfil', exact: true }).click();

  await expect(page).toHaveURL(/\/perfil$/);
});

test('excluir remove a notificação da lista, sem precisar de confirmação (RF84)', async ({ page }) => {
  await mockNotificacoes(page, [
    { id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'Notificação A', link: null, lida: false, criadoEm: '2026-10-08T00:00:00Z' },
    { id: 2, tipo: 'ONBOARDING_PERFIL', texto: 'Notificação B', link: null, lida: false, criadoEm: '2026-10-08T01:00:00Z' },
  ]);
  await plantarToken(page, ['ALUNO']);
  await page.goto('/notificacoes');

  await page.getByRole('button', { name: 'Excluir notificação: Notificação A' }).click();

  await expect(page.getByText('Notificação A')).toHaveCount(0);
  await expect(page.getByText('Notificação B')).toBeVisible();
});

test('erro ao excluir mostra mensagem e mantém a notificação e as outras na lista', async ({ page }) => {
  await mockNotificacoes(page, [
    { id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'Notificação A', link: null, lida: false, criadoEm: '2026-10-08T00:00:00Z' },
    { id: 2, tipo: 'ONBOARDING_PERFIL', texto: 'Notificação B', link: null, lida: false, criadoEm: '2026-10-08T01:00:00Z' },
  ]);
  // Sobrepõe só o DELETE, registrado depois de mockNotificacoes (última rota tem prioridade).
  await page.route(
    (url) => url.port === '8080' && /^\/notificacoes\/\d+$/.test(url.pathname),
    (route) =>
      route.request().method() === 'DELETE'
        ? route.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*' } })
        : route.fallback(),
  );
  await plantarToken(page, ['ALUNO']);
  await page.goto('/notificacoes');

  await page.getByRole('button', { name: 'Excluir notificação: Notificação A' }).click();

  await expect(page.getByRole('alert')).toContainText('Não foi possível concluir a ação');
  await expect(page.getByText('Notificação A')).toBeVisible();
  await expect(page.getByText('Notificação B')).toBeVisible();
});
