import { expect, test } from '@playwright/test';
import { mockFeedOk } from './support/mocks';
import { plantarToken, semToken } from './support/seed';

/**
 * Área /admin: só o perfil ADMINISTRADOR entra. Sem backend, com JWT plantado no
 * localStorage; `/feed` é mockado porque os redirecionamentos caem nele.
 */

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
});

function nav(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Navegação principal' });
}

test('administrador abre "Administração" pelo menu e vê o painel', async ({ page }) => {
  await plantarToken(page, ['ADMINISTRADOR']);
  await page.goto('/feed');

  await nav(page).getByRole('link', { name: 'Administração' }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Administração' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Administração' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('aluno que digita /admin volta para o Início', async ({ page }) => {
  await plantarToken(page, ['ALUNO']);
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole('heading', { name: 'Administração' })).toHaveCount(0);
});

test('moderador que digita /admin volta para o Início e continua vendo "Denúncias"', async ({
  page,
}) => {
  await plantarToken(page, ['MODERADOR']);
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/feed$/);
  await expect(nav(page).getByRole('link', { name: 'Administração' })).toHaveCount(0);
  await expect(nav(page).getByText('Denúncias', { exact: true })).toBeVisible();
});

test('sem token, /admin vai para o login', async ({ page }) => {
  await semToken(page);
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/login$/);
});
