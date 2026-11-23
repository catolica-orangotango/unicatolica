import { expect, test } from '@playwright/test';
import { mockCursosOk, mockFeedOk, mockMinhasComunidades } from './support/mocks';
import { gatilhoDaConta, menuDaConta, VIEWPORT_DESKTOP } from './support/casca';
import { plantarToken, semToken } from './support/seed';

/**
 * KAN-130 (RNF05): Política de Privacidade e Termos de Uso. Páginas públicas, linkadas no rodapé
 * das telas de entrada e de cadastro e no menu da conta.
 */
test.describe('Páginas legais (KAN-130)', () => {
  test.beforeEach(async ({ page }) => {
    await semToken(page);
    await mockCursosOk(page);
  });

  test('abrem direto pela URL, sem login e sem redirecionar para o login', async ({ page }) => {
    await page.goto('/privacidade');
    await expect(page).toHaveURL(/\/privacidade$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Seus direitos' })).toBeVisible();

    await page.goto('/termos');
    await expect(page).toHaveURL(/\/termos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeVisible();
  });

  for (const rota of ['/login', '/cadastro']) {
    test(`${rota}: os links do rodapé levam às duas páginas`, async ({ page }) => {
      await page.goto(rota);
      const rodape = page.getByRole('navigation', { name: 'Informações legais' });

      await rodape.getByRole('link', { name: 'Privacidade' }).click();
      await expect(page).toHaveURL(/\/privacidade$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeVisible();

      await page.getByRole('link', { name: 'Termos de Uso' }).click();
      await expect(page).toHaveURL(/\/termos$/);

      await page.getByRole('link', { name: 'Voltar para a UniCatólica' }).click();
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test('o rodapé não entra na ordem de tabulação dos campos do login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Senha').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeFocused();
  });

  test('o texto fica legível em 360px, sem rolagem horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/privacidade');

    const largura = await page.evaluate(() => ({
      conteudo: document.documentElement.scrollWidth,
      janela: document.documentElement.clientWidth,
    }));
    expect(largura.conteudo).toBeLessThanOrEqual(largura.janela);
  });
});

test.describe('Menu da conta (KAN-130)', () => {
  test('tem Privacidade e Termos de uso, e cada item abre a página', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await mockMinhasComunidades(page, []);
    await mockFeedOk(page);
    await page.setViewportSize(VIEWPORT_DESKTOP);
    await page.goto('/feed');

    await gatilhoDaConta(page).click();
    await menuDaConta(page).getByRole('menuitem', { name: 'Privacidade' }).click();
    await expect(page).toHaveURL(/\/privacidade$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeVisible();
  });
});
