import { expect, test } from '@playwright/test';
import { mockFeedOk, mockLogoutOk } from './support/mocks';
import { plantarToken, tokenAtual } from './support/seed';

/**
 * Suíte 4 - dropdown do avatar da topbar (Story 14.3).
 * Abre/fecha, foco de volta no gatilho, itens inertes e Sair -> logout + /login.
 */

test.beforeEach(async ({ page }) => {
  await plantarToken(page, ['ALUNO']);
  await mockLogoutOk(page);
  await mockFeedOk(page); // /feed dispara chamadas próprias desde o Epic 2; conteúdo fora de escopo aqui
  await page.goto('/feed');
});

function avatar(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: 'Menu da conta' });
}

function menu(page: import('@playwright/test').Page) {
  return page.getByRole('menu', { name: 'Conta' });
}

test('clique no avatar abre o menu com Perfil, Configurações e Sair', async ({ page }) => {
  await expect(avatar(page)).toHaveAttribute('aria-expanded', 'false');

  await avatar(page).click();

  await expect(avatar(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(menu(page)).toBeVisible();
  await expect(menu(page).getByRole('menuitem')).toHaveText(['Perfil', 'Configurações', 'Sair']);
});

test('Configurações é menuitem inerte (aria-disabled); Perfil não', async ({ page }) => {
  await avatar(page).click();

  await expect(menu(page).getByRole('menuitem', { name: 'Perfil' })).not.toHaveAttribute('aria-disabled');
  await expect(menu(page).getByRole('menuitem', { name: 'Configurações' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

test('Escape fecha o menu e devolve o foco ao avatar', async ({ page }) => {
  await avatar(page).click();
  await expect(menu(page)).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(menu(page)).toHaveCount(0);
  await expect(avatar(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(avatar(page)).toBeFocused();
});

test('clique fora fecha o menu', async ({ page }) => {
  await avatar(page).click();
  await expect(menu(page)).toBeVisible();

  // Marca da sidebar: estática, sempre presente independente do estado (carregando /
  // pronto / erro) do conteúdo de /feed, que é fora de escopo desta suíte.
  await page.getByText('UniCatólica').click();

  await expect(menu(page)).toHaveCount(0);
  await expect(avatar(page)).toHaveAttribute('aria-expanded', 'false');
});

test('ativar um item fecha o menu e devolve o foco ao avatar', async ({ page }) => {
  await avatar(page).click();
  // Configurações é inerte (aria-disabled) mas ainda dismissa o menu ao ser ativado;
  // `force` pula o actionability check do Playwright (que trata aria-disabled
  // como desabilitado), sem deixar de disparar o click real.
  await menu(page).getByRole('menuitem', { name: 'Configurações' }).click({ force: true });

  await expect(menu(page)).toHaveCount(0);
  await expect(avatar(page)).toBeFocused();
});

test('Sair chama o logout, limpa o token e navega para /login', async ({ page }) => {
  await avatar(page).click();
  await menu(page).getByRole('menuitem', { name: 'Sair' }).click();

  await expect(page).toHaveURL(/\/login$/);
  expect(await tokenAtual(page)).toBeNull();
});

test.describe('com prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('o menu ainda abre e fecha normalmente', async ({ page }) => {
    await avatar(page).click();
    await expect(menu(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu(page)).toHaveCount(0);
  });
});
