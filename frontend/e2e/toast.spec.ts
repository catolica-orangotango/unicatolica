import { expect, test } from '@playwright/test';
import { semToken } from './support/seed';

// Espelha `TOAST_DURACAO_MS` de src/app/ui/toast/toast.service.ts (não
// importado aqui para o runner do Playwright não carregar o @angular/core).
const TOAST_DURACAO_MS = 4000;

/**
 * Suíte 5 - toasts e motion mínimo (Story 14.5).
 *
 * As Stories 2.3 (auto-join) e 2.4 (join de comunidade aberta) já ligaram
 * gatilhos reais de `ToastService.mostrar()` - mas esses fluxos vivem em
 * Comunidades (Epic 2, conteúdo de /feed e /comunidades), fora do escopo
 * definido pra esta suíte (que cobre só o primitivo de toast/motion da Story
 * 14.5). Por isso `main.ts` expõe o serviço em `window.__ucToast` SÓ em dev
 * mode, e os testes abaixo acionam por ali em vez de mockar a lista de
 * comunidades e clicar em "Participar".
 */

type ToastHandle = {
  mostrar(mensagem: string, opcoes?: { tipo?: 'sucesso' | 'erro'; acao?: { rotulo: string; aoAcionar(): void } }): void;
};

async function dispararToast(page: import('@playwright/test').Page, mensagem: string) {
  await page.evaluate(
    (m) => (window as unknown as { __ucToast: ToastHandle }).__ucToast.mostrar(m),
    mensagem,
  );
}

test.beforeEach(async ({ page }) => {
  await semToken(page);
  await page.goto('/login'); // rota pública; o <uc-toast-host> é global (app.html)
  await page.waitForFunction(() => '__ucToast' in window);
});

function itens(page: import('@playwright/test').Page) {
  return page.locator('[role="status"] .uc-toast-host__item');
}

/**
 * Toast de erro com a ação "Tentar de novo" (redesign KAN-91). A função `aoAcionar`
 * não atravessa o `evaluate`, então é montada dentro da página; acionar grava
 * `window.__acionou` para o teste conferir.
 */
async function dispararToastDeErro(page: import('@playwright/test').Page, mensagem: string) {
  await page.evaluate((m) => {
    const w = window as unknown as { __ucToast: ToastHandle; __acionou?: boolean };
    w.__ucToast.mostrar(m, {
      tipo: 'erro',
      acao: {
        rotulo: 'Tentar de novo',
        aoAcionar() {
          w.__acionou = true;
        },
      },
    });
  }, mensagem);
}

test('mostrar() renderiza um toast com live-region, ícone de check e a mensagem', async ({
  page,
}) => {
  await dispararToast(page, 'Você entrou em Atlética');

  const regiao = page.locator('[role="status"]');
  await expect(regiao).toHaveAttribute('aria-live', 'polite');
  await expect(itens(page)).toHaveCount(1);
  await expect(itens(page).first()).toHaveText('Você entrou em Atlética');
  await expect(itens(page).first().locator('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('o toast é escuro (fundo --uc-color-ink, texto --uc-color-surface) no novo markup', async ({ page }) => {
  await dispararToast(page, 'Você entrou em Atlética');

  const item = itens(page).first();
  await expect(item.locator('.uc-toast-host__texto')).toHaveText('Você entrou em Atlética');
  await expect(item.locator('.uc-toast-host__icon--ok')).toHaveCount(1);
  await expect(item).not.toHaveAttribute('role', 'alert');
  // --uc-color-ink (#18181B) e --uc-color-surface (#FFFFFF) como o navegador reporta.
  await expect(item).toHaveCSS('background-color', 'rgb(24, 24, 27)');
  await expect(item).toHaveCSS('color', 'rgb(255, 255, 255)');
});

test('toast de erro tem role="alert", ícone de erro e o botão "Tentar de novo"', async ({ page }) => {
  await dispararToastDeErro(page, 'Não foi possível salvar.');

  const alerta = page.getByRole('alert');
  await expect(alerta).toHaveCount(1);
  await expect(alerta).toHaveClass(/uc-toast-host__item/);
  await expect(alerta.locator('.uc-toast-host__icon--erro')).toHaveCount(1);
  await expect(alerta.locator('.uc-toast-host__texto')).toHaveText('Não foi possível salvar.');

  await alerta.getByRole('button', { name: 'Tentar de novo' }).click();
  expect(await page.evaluate(() => (window as unknown as { __acionou?: boolean }).__acionou)).toBe(true);
});

test(`com foco no botão de ação, o toast não some após ${TOAST_DURACAO_MS}ms; some depois que o foco sai`, async ({
  page,
}) => {
  await dispararToastDeErro(page, 'Falha de rede.');
  const acao = page.getByRole('alert').getByRole('button', { name: 'Tentar de novo' });
  await acao.focus();
  await expect(acao).toBeFocused();

  // Espera de propósito mais que a duração: com o foco dentro o timer fica pausado.
  await page.waitForTimeout(TOAST_DURACAO_MS + 1_000);
  await expect(page.getByRole('alert')).toHaveCount(1);

  await page.getByLabel('E-mail').focus();
  await expect(page.getByRole('alert')).toHaveCount(0, { timeout: TOAST_DURACAO_MS + 2_000 });
});

test('o toast fica ancorado no canto inferior direito da viewport', async ({ page }) => {
  await dispararToast(page, 'Voto registrado');

  const caixa = await itens(page).first().boundingBox();
  const vp = page.viewportSize()!;
  expect(caixa).not.toBeNull();
  expect(vp.width - (caixa!.x + caixa!.width)).toBeLessThan(64);
  expect(vp.height - (caixa!.y + caixa!.height)).toBeLessThan(64);
});

test('a animação de entrada dura ~150ms (regra de motion mínimo)', async ({ page }) => {
  await dispararToast(page, 'Você entrou em Atlética');

  const duracao = await itens(page)
    .first()
    .evaluate((el) => getComputedStyle(el).animationDuration);
  expect(duracao).toBe('0.15s');
});

test('duas chamadas seguidas empilham dois toasts', async ({ page }) => {
  await dispararToast(page, 'Primeira');
  await dispararToast(page, 'Segunda');

  await expect(itens(page)).toHaveText(['Primeira', 'Segunda']);
});

test('mensagem em branco é no-op', async ({ page }) => {
  await dispararToast(page, '   ');

  await expect(itens(page)).toHaveCount(0);
});

test(`o toast some sozinho após ${TOAST_DURACAO_MS}ms, sem controle de fechar`, async ({
  page,
}) => {
  await dispararToast(page, 'Você entrou em Atlética');
  await expect(itens(page)).toHaveCount(1);

  await expect(itens(page).first().getByRole('button')).toHaveCount(0);
  await expect(itens(page)).toHaveCount(0, { timeout: TOAST_DURACAO_MS + 2_000 });
});

test.describe('com prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('a entrada não anima (animation: none)', async ({ page }) => {
    await dispararToast(page, 'Você entrou em Atlética');

    const nome = await itens(page)
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(nome).toBe('none');
  });
});
