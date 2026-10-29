import { expect, test, type Page } from '@playwright/test';
import {
  VIEWPORT_CELULAR,
  VIEWPORT_DESKTOP,
  VIEWPORT_TABLET,
  avatarDaConta,
  barraDeAbas,
  menuDaConta,
  navPrincipal,
} from './support/casca';
import { mockFeedOk, mockLogoutOk, mockMinhasComunidades, mockModeracao } from './support/mocks';
import { plantarToken, tokenAtual } from './support/seed';

/**
 * Layout da casca do redesign (KAN-91), medido no navegador: `layout/shell/shell.scss`
 * monta três colunas centradas como um bloco (menu 248, conteúdo 600, lateral 340, com
 * `--uc-layout-gap` entre elas); telas de trabalho (`data.largo`) usam menu + até 1040;
 * até 1180px a lateral some; até 760px ficam a barra superior e a barra de abas.
 */

/** Tolerância das medidas, em px (arredondamento de subpixel). */
const TOLERANCIA = 2;

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
});

/** Faixas do grid da casca como o navegador as resolve, e o gap entre elas. */
async function gridDaCasca(page: Page): Promise<{ faixas: number[]; gap: number }> {
  return page.locator('app-shell').evaluate((el) => {
    const estilo = getComputedStyle(el);
    return {
      faixas: estilo.gridTemplateColumns.split(' ').map((faixa) => parseFloat(faixa)),
      gap: parseFloat(estilo.columnGap),
    };
  });
}

async function caixa(page: Page, seletor: string) {
  const box = await page.locator(seletor).first().boundingBox();
  expect(box, `${seletor} sem caixa (não visível?)`).not.toBeNull();
  return box!;
}

test.describe('desktop (1440px)', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('menu 248, conteúdo 600 e lateral 340 formam um bloco centrado na viewport', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await expect(navPrincipal(page)).toBeVisible();

    const menu = await caixa(page, 'nav[aria-label="Navegação principal"]');
    const conteudo = await caixa(page, 'main');
    expect(Math.abs(menu.width - 248)).toBeLessThanOrEqual(TOLERANCIA);
    expect(Math.abs(conteudo.width - 600)).toBeLessThanOrEqual(TOLERANCIA);

    // A faixa da lateral existe mesmo vazia: o bloco fica igual com ou sem conteúdo nela.
    const { faixas, gap } = await gridDaCasca(page);
    expect(faixas).toHaveLength(3);
    expect(Math.abs(faixas[2] - 340)).toBeLessThanOrEqual(TOLERANCIA);

    const larguraDoBloco = faixas.reduce((soma, faixa) => soma + faixa, 0) + gap * (faixas.length - 1);
    const centroDoBloco = menu.x + larguraDoBloco / 2;
    const centroDaViewport = await page.evaluate(() => document.documentElement.clientWidth / 2);
    expect(Math.abs(centroDoBloco - centroDaViewport)).toBeLessThanOrEqual(TOLERANCIA);
    // O conteúdo começa logo depois do menu e do gap.
    expect(Math.abs(conteudo.x - (menu.x + faixas[0] + gap))).toBeLessThanOrEqual(TOLERANCIA);

    // Nenhuma tela registra conteúdo lateral (ShellLateralService) até a KAN-93, então o
    // <aside> não é renderizado; quando alguma registrar, medir também a caixa dele aqui.
    await expect(page.locator('aside.shell__lateral')).toHaveCount(0);
  });

  test('modo largo (/comunidades): menu e conteúdo de até 1040, sem lateral, ainda centrados', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/comunidades');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const menu = await caixa(page, 'nav[aria-label="Navegação principal"]');
    const conteudo = await caixa(page, 'main');
    expect(Math.abs(menu.width - 248)).toBeLessThanOrEqual(TOLERANCIA);
    expect(conteudo.width).toBeLessThanOrEqual(1040 + TOLERANCIA);
    expect(conteudo.width).toBeGreaterThan(600 + TOLERANCIA);

    const { faixas, gap } = await gridDaCasca(page);
    expect(faixas).toHaveLength(2);
    const larguraDoBloco = faixas[0] + gap + faixas[1];
    const centroDaViewport = await page.evaluate(() => document.documentElement.clientWidth / 2);
    expect(Math.abs(menu.x + larguraDoBloco / 2 - centroDaViewport)).toBeLessThanOrEqual(TOLERANCIA);
    await expect(page.locator('aside.shell__lateral')).toHaveCount(0);
  });
});

test.describe('tablet (1024px)', () => {
  test.use({ viewport: VIEWPORT_TABLET });

  test('o menu continua visível e o layout tem duas colunas (menu e conteúdo)', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    await expect(navPrincipal(page)).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(barraDeAbas(page)).toBeHidden();
    await expect(avatarDaConta(page)).toBeHidden();

    const { faixas } = await gridDaCasca(page);
    expect(faixas).toHaveLength(2);
    const menu = await caixa(page, 'nav[aria-label="Navegação principal"]');
    expect(Math.abs(menu.width - 248)).toBeLessThanOrEqual(TOLERANCIA);
  });
});

test.describe('celular (360px)', () => {
  test.use({ viewport: VIEWPORT_CELULAR });

  const NOME_LONGO =
    'Associação Atlética Acadêmica dos Estudantes de Engenharia de Software ' +
    'Pneumoultramicroscopicossilicovulcanoconiótico do Campus Joinville';

  test('barra superior e barra de abas visíveis, abas de pelo menos 44px de altura', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    await expect(page.locator('app-shell-topbar header')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Suas comunidades' })).toBeVisible();
    await expect(avatarDaConta(page)).toBeVisible();
    await expect(barraDeAbas(page)).toBeVisible();

    const abas = barraDeAbas(page).locator('.abas__item');
    await expect(abas).toHaveCount(4);
    for (const aba of await abas.all()) {
      const box = await aba.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('sem rolagem horizontal, mesmo com nome de comunidade muito longo, com a gaveta fechada e aberta', async ({
    page,
  }) => {
    await mockMinhasComunidades(page, [
      { id: 1, nome: NOME_LONGO, tipo: 'ABERTA' },
      { id: 2, nome: 'Engenharia de Software', tipo: 'CURSO' },
    ]);
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await page.waitForLoadState('networkidle');

    const semRolagem = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await semRolagem()).toBe(true);

    await page.getByRole('button', { name: 'Suas comunidades' }).click();
    await expect(navPrincipal(page).getByRole('link', { name: /Associação Atlética/ })).toBeVisible();
    expect(await semRolagem()).toBe(true);
  });

  test('a aba ativa tem aria-current="page" e acompanha a navegação', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    const inicio = barraDeAbas(page).getByRole('link', { name: 'Início' });
    const comunidades = barraDeAbas(page).getByRole('link', { name: 'Comunidades' });
    await expect(inicio).toHaveAttribute('aria-current', 'page');
    await expect(comunidades).not.toHaveAttribute('aria-current', 'page');

    await comunidades.click();

    await expect(page).toHaveURL(/\/comunidades$/);
    await expect(comunidades).toHaveAttribute('aria-current', 'page');
    await expect(inicio).not.toHaveAttribute('aria-current', 'page');
  });

  test('aluno: a terceira aba é o botão Notificações', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    const abas = barraDeAbas(page).locator('.abas__item');
    await expect(abas).toHaveText(['Início', 'Comunidades', 'Notificações', 'Perfil']);
    await expect(abas.nth(2)).toHaveRole('button');
    await expect(barraDeAbas(page).getByText('Denúncias', { exact: true })).toHaveCount(0);
  });

  test('moderador: a terceira aba é o link Denúncias, no lugar de Notificações', async ({ page }) => {
    await mockModeracao(page, []);
    await plantarToken(page, ['MODERADOR']);
    await page.goto('/feed');

    const abas = barraDeAbas(page).locator('.abas__item');
    await expect(abas).toHaveText(['Início', 'Comunidades', 'Denúncias', 'Perfil']);
    await expect(abas.nth(2)).toHaveRole('link');
    await expect(abas.nth(2)).toHaveAttribute('href', '/moderacao/denuncias');
    await expect(barraDeAbas(page).getByText('Notificações', { exact: true })).toHaveCount(0);
  });

  test('"Sair" é alcançável pelo menu do avatar da barra superior', async ({ page }) => {
    await mockLogoutOk(page);
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    await avatarDaConta(page).click();
    await menuDaConta(page).getByRole('menuitem', { name: 'Sair' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenAtual(page)).toBeNull();
  });
});
