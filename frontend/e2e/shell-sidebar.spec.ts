import { expect, test, type Page } from '@playwright/test';
import { VIEWPORT_CELULAR, VIEWPORT_DESKTOP, VIEWPORT_TABLET, barraDeAbas, navPrincipal } from './support/casca';
import { CHAVE_TOKEN } from './support/jwt';
import { mockComunidadeComFeed, mockFeedOk, mockMinhasComunidades } from './support/mocks';
import { plantarToken, semToken } from './support/seed';

/**
 * Suíte 3 - menu da casca dirigido por papel (Story 14.3, redesenhado na KAN-91).
 *
 * Sem backend: um JWT não assinado com a claim `roles` é plantado no localStorage
 * antes da navegação. A composição segue `NAV_ITENS` e `ITENS_EM_BREVE` de
 * `layout/shell/shell.ts`: menu principal (Início, Comunidades, Denúncias para
 * moderador e administrador, Notificações, Perfil, Administração só para
 * administrador), a seção "Suas comunidades" e a seção "Em breve" de itens inertes.
 *
 * Desktop (1440) e tablet (1024) mostram o menu inteiro; no celular (360) o menu
 * vira a gaveta "Suas comunidades", aberta pelo botão da barra superior.
 */

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
});

const MENU_ALUNO = ['Início', 'Comunidades', 'Notificações', 'Perfil'];
const MENU_MODERADOR = ['Início', 'Comunidades', 'Denúncias', 'Notificações', 'Perfil'];
const MENU_ADMINISTRADOR = [...MENU_MODERADOR, 'Administração'];

const EM_BREVE_ALUNO = ['Busca', 'Mensagens', 'Criar enquete'];
const EM_BREVE_PRIVILEGIADO = [...EM_BREVE_ALUNO, 'Solicitações de fixação'];

const COMUNIDADES = [
  { id: 1, nome: 'Engenharia de Software', tipo: 'CURSO' as const },
  { id: 2, nome: 'Clube de Xadrez', tipo: 'ABERTA' as const },
];

/** Rótulos do menu principal; `toHaveText([...])` casa em ordem e faz auto-retry. */
function itensDoMenu(page: Page) {
  return navPrincipal(page).locator('.shell__nav-list .shell__nav-rotulo');
}

function itensEmBreve(page: Page) {
  return navPrincipal(page).locator('.shell__breve-item');
}

for (const viewport of [VIEWPORT_DESKTOP, VIEWPORT_TABLET]) {
  test.describe(`menu completo em ${viewport.width}px`, () => {
    test.use({ viewport });

    test('aluno vê Início, Comunidades, Notificações e Perfil, sem os itens de moderação', async ({ page }) => {
      await plantarToken(page, ['ALUNO']);
      await page.goto('/feed');

      await expect(itensDoMenu(page)).toHaveText(MENU_ALUNO);
      await expect(itensEmBreve(page)).toHaveText(EM_BREVE_ALUNO);
      await expect(navPrincipal(page).getByText('Denúncias', { exact: true })).toHaveCount(0);
      await expect(navPrincipal(page).getByText('Solicitações de fixação', { exact: true })).toHaveCount(0);
      await expect(navPrincipal(page).getByText('Suas comunidades', { exact: true })).toBeVisible();
    });

    test('MODERADOR vê Denúncias em terceiro e "Solicitações de fixação" em "Em breve"', async ({ page }) => {
      await plantarToken(page, ['MODERADOR']);
      await page.goto('/feed');

      await expect(itensDoMenu(page)).toHaveText(MENU_MODERADOR);
      await expect(itensEmBreve(page)).toHaveText(EM_BREVE_PRIVILEGIADO);
      await expect(navPrincipal(page).getByRole('link', { name: 'Administração' })).toHaveCount(0);
    });

    test('ADMINISTRADOR vê também "Administração", no fim do menu', async ({ page }) => {
      await plantarToken(page, ['ADMINISTRADOR']);
      await page.goto('/feed');

      await expect(itensDoMenu(page)).toHaveText(MENU_ADMINISTRADOR);
      await expect(itensEmBreve(page)).toHaveText(EM_BREVE_PRIVILEGIADO);
      await expect(navPrincipal(page).getByRole('link', { name: 'Administração' })).toHaveAttribute('href', '/admin');
    });

    test('o botão "Suas comunidades" e a barra de abas do celular não aparecem', async ({ page }) => {
      await plantarToken(page, ['ALUNO']);
      await page.goto('/feed');

      await expect(navPrincipal(page)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Suas comunidades' })).toBeHidden();
      await expect(barraDeAbas(page)).toBeHidden();
    });
  });
}

test.describe('desktop (1440px)', () => {
  test.use({ viewport: VIEWPORT_DESKTOP });

  test('token malformado: casca renderiza, itens de moderação escondidos, sem erro de console', async ({ page }) => {
    const erros: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && erros.push(msg.text()));
    page.on('pageerror', (err) => erros.push(err.message));

    await page.addInitScript((chave) => window.localStorage.setItem(chave, 'nao-e-jwt'), CHAVE_TOKEN);
    await page.goto('/feed');

    await expect(itensDoMenu(page)).toHaveText(MENU_ALUNO);
    expect(erros).toEqual([]);
  });

  test('item de "Em breve" é um <span> inerte, fora da ordem de tabulação, e não navega', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    const busca = navPrincipal(page).getByText('Busca', { exact: true });
    await expect(busca).toHaveAttribute('aria-disabled', 'true');
    expect(await busca.evaluate((el) => el.tagName)).toBe('SPAN');
    expect(await busca.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(-1);

    await busca.click();
    await expect(page).toHaveURL(/\/feed$/);
  });

  test('"Início" carrega aria-current="page" em /feed; "Comunidades" é link mas não ativo', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    const inicio = navPrincipal(page).getByRole('link', { name: 'Início' });
    await expect(inicio).toHaveAttribute('aria-current', 'page');
    await expect(inicio).toHaveAttribute('href', '/feed');
    await expect(inicio).toHaveClass(/shell__nav-item--active/);

    const comunidades = navPrincipal(page).getByRole('link', { name: 'Comunidades', exact: true });
    await expect(comunidades).toHaveAttribute('href', '/comunidades');
    await expect(comunidades).not.toHaveAttribute('aria-current', 'page');

    // Notificações é botão (abre o painel); sem comunidades, os links são Início, Comunidades e Perfil.
    await expect(navPrincipal(page).getByRole('link')).toHaveCount(3);
    await expect(navPrincipal(page).getByRole('button', { name: 'Notificações' })).toBeVisible();
  });

  test('a comunidade aberta fica destacada em "Suas comunidades", com aria-current="page" (KAN-89)', async ({
    page,
  }) => {
    await mockMinhasComunidades(page, COMUNIDADES);
    await mockComunidadeComFeed(page, { id: 1, nome: 'Engenharia de Software', tipo: 'CURSO', souMembro: true });
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    const engenharia = navPrincipal(page).getByRole('link', { name: 'Engenharia de Software' });
    const xadrez = navPrincipal(page).getByRole('link', { name: 'Clube de Xadrez' });
    await expect(engenharia).not.toHaveAttribute('aria-current', 'page');

    await engenharia.click();

    await expect(page).toHaveURL(/\/comunidades\/1$/);
    await expect(engenharia).toHaveAttribute('aria-current', 'page');
    await expect(engenharia).toHaveClass(/shell__comunidade-item--ativa/);
    await expect(xadrez).not.toHaveAttribute('aria-current', 'page');
    await expect(xadrez).not.toHaveClass(/shell__comunidade-item--ativa/);
  });

  test('sem token, acessar /feed redireciona para /login e a casca não renderiza', async ({ page }) => {
    await semToken(page);
    await page.goto('/feed');

    await expect(page).toHaveURL(/\/login$/);
    await expect(navPrincipal(page)).toHaveCount(0);
  });
});

/**
 * Gaveta "Suas comunidades" do celular (Story 14.4, redesenhada na KAN-91). Até 760px
 * (`$uc-bp-mobile` em `styles/_breakpoints.scss`) o menu vira uma gaveta sobreposta,
 * aberta pelo botão "Suas comunidades" da barra superior. Nela ficam só os links das
 * comunidades: a navegação principal mora na barra de abas e a conta no avatar.
 */
test.describe('gaveta "Suas comunidades" no celular (360px)', () => {
  test.use({ viewport: VIEWPORT_CELULAR });

  function botaoGaveta(page: Page) {
    return page.getByRole('button', { name: 'Suas comunidades' });
  }

  test.beforeEach(async ({ page }) => {
    await mockMinhasComunidades(page, COMUNIDADES);
  });

  test('a gaveta começa fechada e o botão "Suas comunidades" a controla', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');

    await expect(botaoGaveta(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(botaoGaveta(page)).toHaveAttribute('aria-controls', 'shell-sidebar-nav');
    await expect(navPrincipal(page)).not.toBeVisible();

    await botaoGaveta(page).click();

    await expect(botaoGaveta(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(navPrincipal(page)).toBeVisible();
  });

  test('na gaveta ficam só os links das comunidades', async ({ page }) => {
    await plantarToken(page, ['MODERADOR']);
    await page.goto('/feed');
    await botaoGaveta(page).click();
    await expect(navPrincipal(page)).toBeVisible();

    await expect(navPrincipal(page).getByRole('link')).toHaveText([/Engenharia de Software/, /Clube de Xadrez/]);
    await expect(navPrincipal(page).getByRole('button')).toHaveCount(0);
    for (const item of [...MENU_MODERADOR, 'Busca']) {
      await expect(navPrincipal(page).getByText(item, { exact: true })).toBeHidden();
    }
  });

  test('Escape fecha a gaveta e devolve o foco ao botão "Suas comunidades"', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await botaoGaveta(page).click();
    await expect(navPrincipal(page)).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(navPrincipal(page)).not.toBeVisible();
    await expect(botaoGaveta(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(botaoGaveta(page)).toBeFocused();
  });

  test('escolher uma comunidade fecha a gaveta e navega', async ({ page }) => {
    await mockComunidadeComFeed(page, { id: 2, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await botaoGaveta(page).click();

    await navPrincipal(page).getByRole('link', { name: 'Clube de Xadrez' }).click();

    await expect(page).toHaveURL(/\/comunidades\/2$/);
    await expect(navPrincipal(page)).not.toBeVisible();
  });

  test('o foco não escapa da gaveta aberta via Tab, passando só pelos itens visíveis', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await botaoGaveta(page).click();
    await expect(navPrincipal(page)).toBeVisible();

    // Só os focáveis visíveis: menu, "Em breve" e cartão da conta estão em display: none.
    const focaveis = navPrincipal(page).locator('a, button').filter({ visible: true });
    await expect(focaveis).toHaveCount(COMUNIDADES.length);

    await focaveis.last().focus();
    await page.keyboard.press('Tab');
    await expect(focaveis.first()).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(focaveis.last()).toBeFocused();
  });

  test('sem rolagem horizontal da página com a gaveta fechada', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/feed');
    await expect(barraDeAbas(page)).toBeVisible();

    const temRolagemHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(temRolagemHorizontal).toBe(false);
  });
});
