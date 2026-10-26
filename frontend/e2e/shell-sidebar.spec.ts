import { expect, test } from '@playwright/test';
import { CHAVE_TOKEN } from './support/jwt';
import { mockFeedOk } from './support/mocks';
import { plantarToken, semToken } from './support/seed';

/**
 * Suíte 3 - sidebar da shell dirigida por papel (Story 14.3).
 *
 * Sem backend: um JWT não assinado com a claim `roles` é plantado no
 * localStorage antes da navegação. A ordem dos itens é a da tabela
 * "Navegação global" de EXPERIENCE.md. `/feed` (conteúdo fora de escopo desta
 * suíte) dispara chamadas próprias desde o Epic 2 - `mockFeedOk` mantém a
 * página determinística sem depender de backend.
 */

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
});

const ITENS_COMUNS = [
  'Início',
  'Buscar',
  'Mensagens',
  'Notificações',
  'Criar enquete',
  'Suas comunidades',
  'Descobrir comunidades',
];

const ITENS_MODERACAO = ['Denúncias', 'Solicitações de fixação'];

// Mesma ordem, com o par de moderação entre "Criar enquete" e "Suas comunidades".
const ITENS_PRIVILEGIADOS = [
  'Início',
  'Buscar',
  'Mensagens',
  'Notificações',
  'Criar enquete',
  ...ITENS_MODERACAO,
  'Suas comunidades',
  'Descobrir comunidades',
];

function nav(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Navegação principal' });
}

/** Coleção de rótulos da sidebar; `toHaveText([...])` casa em ordem e faz auto-retry. */
function itensSidebar(page: import('@playwright/test').Page) {
  return nav(page).locator('.shell__nav-item');
}

test('aluno vê exatamente os 7 itens comuns, sem os de moderação', async ({ page }) => {
  await plantarToken(page, ['ALUNO']);
  await page.goto('/feed');

  await expect(itensSidebar(page)).toHaveText(ITENS_COMUNS);
  for (const item of ITENS_MODERACAO) {
    await expect(nav(page).getByText(item, { exact: true })).toHaveCount(0);
  }
});

test('MODERADOR vê os 9 itens, com moderação entre "Criar enquete" e "Suas comunidades"', async ({
  page,
}) => {
  await plantarToken(page, ['MODERADOR']);
  await page.goto('/feed');

  await expect(itensSidebar(page)).toHaveText(ITENS_PRIVILEGIADOS);
  await expect(nav(page).getByRole('link', { name: 'Administração' })).toHaveCount(0);
});

test('ADMINISTRADOR vê os 10 itens, com "Administração" no fim', async ({ page }) => {
  await plantarToken(page, ['ADMINISTRADOR']);
  await page.goto('/feed');

  await expect(itensSidebar(page)).toHaveText([...ITENS_PRIVILEGIADOS, 'Administração']);
  await expect(nav(page).getByRole('link', { name: 'Administração' })).toHaveAttribute(
    'href',
    '/admin',
  );
});

test('token malformado: shell renderiza, itens de moderação escondidos, sem erro de console', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('console', (msg) => msg.type() === 'error' && erros.push(msg.text()));
  page.on('pageerror', (err) => erros.push(err.message));

  await page.addInitScript((chave) => window.localStorage.setItem(chave, 'nao-e-jwt'), CHAVE_TOKEN);
  await page.goto('/feed');

  await expect(itensSidebar(page)).toHaveText(ITENS_COMUNS);
  expect(erros).toEqual([]);
});

test('item sem rota é um <span> inerte, fora da ordem de tabulação, e não navega', async ({
  page,
}) => {
  await plantarToken(page, ['ALUNO']);
  await page.goto('/feed');

  const buscar = nav(page).getByText('Buscar', { exact: true });
  await expect(buscar).toHaveAttribute('aria-disabled', 'true');
  expect(await buscar.evaluate((el) => el.tagName)).toBe('SPAN');
  expect(await buscar.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);

  await buscar.click();
  await expect(page).toHaveURL(/\/feed$/);
});

test('"Início" carrega aria-current="page" em /feed; "Descobrir comunidades" é link mas não ativo', async ({
  page,
}) => {
  await plantarToken(page, ['ALUNO']);
  await page.goto('/feed');

  const inicio = nav(page).getByRole('link', { name: 'Início' });
  await expect(inicio).toHaveAttribute('aria-current', 'page');
  await expect(inicio).toHaveAttribute('href', '/feed');
  await expect(inicio).toHaveClass(/shell__nav-item--active/);

  // "Descobrir comunidades" (Epic 2) também tem rota própria; os dois são os
  // únicos itens com rota hoje (o resto ainda é inerte, path: null).
  const descobrir = nav(page).getByRole('link', { name: 'Descobrir comunidades' });
  await expect(descobrir).toHaveAttribute('href', '/comunidades');
  await expect(descobrir).not.toHaveAttribute('aria-current', 'page');

  await expect(nav(page).getByRole('link')).toHaveCount(2);
});

test('sem token, acessar /feed redireciona para /login e a shell não renderiza', async ({
  page,
}) => {
  await semToken(page);
  await page.goto('/feed');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
});

/**
 * Comportamento responsivo da navegação (Story 14.4). Abaixo do breakpoint
 * (1024px, `styles/_breakpoints.scss`) a sidebar vira gaveta sobreposta,
 * aberta por um botão "Menu" na topbar; acima dele nada muda (cobertura das
 * suítes acima, que rodam no viewport "Desktop Chrome" padrão do projeto).
 */
test.describe('gaveta de navegação mobile (360×800)', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  function botaoMenu(page: import('@playwright/test').Page) {
    return page.getByRole('button', { name: 'Menu', exact: true });
  }

  test('a gaveta começa fechada e o botão Menu a controla', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(nav(page)).not.toBeVisible();

    await botaoMenu(page).click();

    await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(nav(page)).toBeVisible();
  });

  test('Escape fecha a gaveta e devolve o foco ao botão Menu', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await botaoMenu(page).click();
    await expect(nav(page)).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(nav(page)).not.toBeVisible();
    await expect(botaoMenu(page)).toBeFocused();
  });

  test('escolher "Descobrir comunidades" fecha a gaveta e navega', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await botaoMenu(page).click();

    await nav(page).getByRole('link', { name: 'Descobrir comunidades' }).click();

    await expect(page).toHaveURL(/\/comunidades$/);
    await expect(nav(page)).not.toBeVisible();
  });

  test('moderador: "Denúncias" aparece na gaveta, com o contador de pendentes', async ({
    page,
  }) => {
    await plantarToken(page, ['MODERADOR']);
    await page.goto('/feed');

    await botaoMenu(page).click();

    await expect(nav(page).getByRole('link', { name: /Denúncias/ })).toBeVisible();
  });

  test('o foco não escapa da gaveta aberta via Tab (foco preso)', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await botaoMenu(page).click();

    const focaveis = nav(page).locator('a, button');
    const total = await focaveis.count();
    await focaveis.nth(total - 1).focus();

    await page.keyboard.press('Tab');

    await expect(focaveis.first()).toBeFocused();
  });

  test('sem rolagem horizontal da página com a gaveta fechada', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    const temRolagemHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(temRolagemHorizontal).toBe(false);
  });
});

/** Acima do breakpoint nada muda: o botão Menu some, a sidebar fica fixa como sempre. */
test.describe('acima do breakpoint (1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('o botão Menu não aparece e a sidebar é sempre visível', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
    await expect(nav(page)).toBeVisible();
  });
});
