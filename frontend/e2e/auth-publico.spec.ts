import { expect, test } from '@playwright/test';
import { mockConfirmacaoInvalida, mockConfirmacaoOk, mockCursosOk } from './support/mocks';
import { semToken } from './support/seed';

/**
 * Suíte 1 - telas públicas de auth (Epic 1, restilizadas na Story 14.7).
 * Renderização, validação de formulário e foco de teclado visível. Sem
 * backend: `/login` não faz chamada até o submit; `/cadastro` só busca a
 * lista de cursos (`mockCursosOk`); a confirmação de e-mail é mockada.
 */

/** `--uc-color-bg` (#FAFAF8) como o navegador reporta. */
const CANVAS_BASE = 'rgb(250, 250, 248)';

test.beforeEach(async ({ page }) => {
  await semToken(page);
  await mockCursosOk(page);
});

test.describe('Camada base global (Story 14.7)', () => {
  // Prova que `styles/_base.scss` chega a um navegador de verdade: o teste
  // unitário só compara o CSS compilado, não o que a página realmente pinta.
  for (const rota of ['/login', '/cadastro', '/confirmar-email']) {
    test(`${rota} pinta o canvas com --uc-color-bg`, async ({ page }) => {
      await page.goto(rota);

      const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(fundo).toBe(CANVAS_BASE);
    });
  }
});

test.describe('Login', () => {
  test('renderiza os campos, labels associadas e o botão Entrar', async ({ page }) => {
    await page.goto('/login');

    const email = page.getByLabel('E-mail');
    const senha = page.getByLabel('Senha');
    await expect(email).toHaveAttribute('type', 'email');
    await expect(senha).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('submeter vazio não navega e não mostra erro de credencial', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('foco de teclado percorre e-mail, senha, Entrar com indicador visível', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').focus();

    for (const controle of [
      page.getByLabel('E-mail'),
      page.getByLabel('Senha'),
      page.getByRole('button', { name: 'Entrar' }),
    ]) {
      await expect(controle).toBeFocused();
      const outline = await controle.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: s.outlineWidth };
      });
      expect(outline.style !== 'none' || outline.width !== '0px').toBe(true);
      await page.keyboard.press('Tab');
    }
  });
});

test.describe('Cadastro', () => {
  const CAMPOS = ['Nome completo', 'E-mail institucional', 'Senha', 'Curso', 'Data de nascimento'];

  test('renderiza os cinco campos com label associada e o botão Cadastrar', async ({ page }) => {
    await page.goto('/cadastro');

    for (const rotulo of CAMPOS) {
      await expect(page.getByLabel(rotulo)).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Cadastrar' })).toBeVisible();
  });

  test('submeter vazio mostra o erro de cada campo e não navega', async ({ page }) => {
    await page.goto('/cadastro');
    await page.getByRole('button', { name: 'Cadastrar' }).click();

    await expect(page.locator('.campo-erro')).toHaveCount(5);
    await expect(page.getByText('Informe seu nome.')).toBeVisible();
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  test('curso é escolhido de uma lista carregada de GET /cursos', async ({ page }) => {
    await page.goto('/cadastro');

    const curso = page.getByLabel('Curso');
    await expect(curso.locator('option')).toHaveText(['Selecione seu curso', 'Administração', 'Engenharia de Software']);
    await curso.selectOption({ label: 'Engenharia de Software' });
    await expect(curso).toHaveValue(/.+/);
  });

  test('e-mail inválido dispara a mensagem específica após blur', async ({ page }) => {
    await page.goto('/cadastro');
    await page.getByLabel('E-mail institucional').fill('abc');
    await page.getByLabel('Senha').click(); // tira o foco -> marca como touched

    await expect(page.getByText('Informe um e-mail institucional válido.')).toBeVisible();
  });
});

test.describe('Confirmar e-mail', () => {
  test('sem token na URL mostra link inválido e caminho de volta ao cadastro', async ({ page }) => {
    await page.goto('/confirmar-email');

    await expect(page.getByRole('heading', { name: 'Não foi possível confirmar' })).toBeVisible();
    await expect(page.getByText('Link de confirmação inválido.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar ao cadastro' })).toHaveAttribute(
      'href',
      '/cadastro',
    );
  });

  test('token válido (mock 204) confirma e leva ao login', async ({ page }) => {
    await mockConfirmacaoOk(page);
    await page.goto('/confirmar-email?token=token-valido');

    await expect(page.getByRole('heading', { name: 'E-mail confirmado!' })).toBeVisible();
    await page.getByRole('link', { name: 'Ir para o login' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('token rejeitado (mock 422) mostra a mensagem da API', async ({ page }) => {
    await mockConfirmacaoInvalida(page);
    await page.goto('/confirmar-email?token=token-expirado');

    await expect(page.getByRole('heading', { name: 'Não foi possível confirmar' })).toBeVisible();
    await expect(page.getByText('Este link de confirmação expirou ou já foi usado.')).toBeVisible();
  });
});
