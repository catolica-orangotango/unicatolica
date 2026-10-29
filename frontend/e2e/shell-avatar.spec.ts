import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  VIEWPORT_CELULAR,
  VIEWPORT_DESKTOP,
  avatarDaConta,
  cartaoDaConta,
  menuDaConta,
} from './support/casca';
import { mockFeedOk, mockLogoutOk, mockMeuPerfil } from './support/mocks';
import { plantarToken, tokenAtual } from './support/seed';

/**
 * Suíte 4 - menu da conta (Story 14.3, redesenhado na KAN-91).
 * Abre/fecha, foco de volta no gatilho, itens inertes e Sair -> logout + /login.
 *
 * O gatilho muda com a largura: no desktop é o cartão da conta no rodapé do menu
 * (nome de `GET /usuarios/me` e papel); no celular é o avatar "Menu da conta" da
 * barra superior. As mesmas regras valem para os dois.
 */

const CENARIOS: { nome: string; viewport: { width: number; height: number }; gatilho: (page: Page) => Locator }[] = [
  { nome: 'desktop (1440px), cartão da conta no rodapé do menu', viewport: VIEWPORT_DESKTOP, gatilho: cartaoDaConta },
  { nome: 'celular (360px), avatar da barra superior', viewport: VIEWPORT_CELULAR, gatilho: avatarDaConta },
];

for (const cenario of CENARIOS) {
  test.describe(cenario.nome, () => {
    test.use({ viewport: cenario.viewport });

    const gatilho = cenario.gatilho;
    const menu = menuDaConta;

    test.beforeEach(async ({ page }) => {
      await plantarToken(page, ['ALUNO']);
      await mockLogoutOk(page);
      await mockFeedOk(page); // /feed dispara chamadas próprias desde o Epic 2; conteúdo fora de escopo aqui
      await page.goto('/feed');
    });

    test('clique no gatilho abre o menu com Perfil, Configurações e Sair', async ({ page }) => {
      await expect(gatilho(page)).toHaveAttribute('aria-expanded', 'false');

      await gatilho(page).click();

      await expect(gatilho(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(menu(page)).toBeVisible();
      await expect(menu(page).getByRole('menuitem')).toHaveText(['Perfil', 'Configurações', 'Sair']);
    });

    test('Configurações é menuitem inerte (aria-disabled); Perfil não', async ({ page }) => {
      await gatilho(page).click();

      await expect(menu(page).getByRole('menuitem', { name: 'Perfil' })).not.toHaveAttribute('aria-disabled');
      await expect(menu(page).getByRole('menuitem', { name: 'Configurações' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    test('Escape fecha o menu e devolve o foco ao gatilho', async ({ page }) => {
      await gatilho(page).click();
      await expect(menu(page)).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(menu(page)).toHaveCount(0);
      await expect(gatilho(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(gatilho(page)).toBeFocused();
    });

    test('clique fora fecha o menu', async ({ page }) => {
      await gatilho(page).click();
      await expect(menu(page)).toBeVisible();

      // A marca "UniCatólica" existe no menu (desktop) e na barra superior (celular);
      // só a do layout atual está visível. É estática, independente do conteúdo de /feed.
      await page.getByText('UniCatólica', { exact: true }).filter({ visible: true }).click();

      await expect(menu(page)).toHaveCount(0);
      await expect(gatilho(page)).toHaveAttribute('aria-expanded', 'false');
    });

    test('Configurações é inerte: ativá-lo não fecha o menu', async ({ page }) => {
      await gatilho(page).click();
      // `force` pula o actionability check do Playwright (que trata aria-disabled
      // como desabilitado), sem deixar de disparar o click real.
      await menu(page).getByRole('menuitem', { name: 'Configurações' }).click({ force: true });

      await expect(menu(page)).toBeVisible();
      await expect(gatilho(page)).toHaveAttribute('aria-expanded', 'true');
    });

    test('ativar Perfil fecha o menu, devolve o foco ao gatilho e navega para /perfil', async ({ page }) => {
      await mockMeuPerfil(page, { usuarioId: 1, nome: 'Usuário Teste', curso: null, periodo: null, interesses: [] });
      await gatilho(page).click();
      await expect(menu(page).getByRole('menuitem', { name: 'Perfil' })).toBeFocused();

      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/\/perfil$/);
      await expect(menu(page)).toHaveCount(0);
      await expect(gatilho(page)).toBeFocused();
    });

    test('Sair chama o logout, limpa o token e navega para /login', async ({ page }) => {
      await gatilho(page).click();
      await menu(page).getByRole('menuitem', { name: 'Sair' }).click();

      await expect(page).toHaveURL(/\/login$/);
      expect(await tokenAtual(page)).toBeNull();
    });

    test.describe('com prefers-reduced-motion', () => {
      test.use({ reducedMotion: 'reduce' });

      test('o menu ainda abre e fecha normalmente', async ({ page }) => {
        await gatilho(page).click();
        await expect(menu(page)).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(menu(page)).toHaveCount(0);
      });
    });
  });
}

test('desktop: o cartão da conta mostra o nome de GET /usuarios/me e o papel', async ({ page }) => {
  await page.setViewportSize(VIEWPORT_DESKTOP);
  await plantarToken(page, ['ALUNO']);
  await mockFeedOk(page);
  await page.goto('/feed');

  await expect(cartaoDaConta(page)).toContainText('Usuário Teste');
  await expect(cartaoDaConta(page)).toContainText('Aluno');
  await expect(avatarDaConta(page)).toBeHidden();
});
