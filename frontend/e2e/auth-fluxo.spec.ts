import { expect, test } from '@playwright/test';
import { mockFeedOk, mockLogin401, mockLoginOk } from './support/mocks';
import { semToken, tokenAtual } from './support/seed';

/**
 * Suíte 2 - fluxo de autenticação entrando na shell.
 *
 * O grupo "mockado" roda sempre (sem backend): `page.route()` responde
 * `/auth/login`. O grupo "backend real" (tag `@backend`) só roda com `E2E_BACKEND=1`
 * e o `quarkus:dev` no ar (job "E2E backend" do CI), usando o usuário semente
 * `aluno.teste` (perfil ALUNO, e-mail confirmado) do changeset
 * `identidade-002-seed-usuario-teste`.
 */

test.beforeEach(async ({ page }) => {
  await semToken(page);
});

async function preencherLogin(page: import('@playwright/test').Page, email: string, senha: string) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('login mockado', () => {
  test('credencial válida cai na shell em /feed com sidebar e avatar', async ({ page }) => {
    // Conteúdo de /feed (Home, Epic 2) é fora de escopo: só mocado pra a
    // página assentar sem depender de backend, sem asserção sobre ele aqui.
    await mockFeedOk(page);
    await mockLoginOk(page, ['ALUNO']);
    await preencherLogin(page, 'aluno.teste@catolicasc.edu.br', 'Senha123!');

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeVisible();
    expect(await tokenAtual(page)).not.toBeNull();
  });

  test('credencial inválida (401) mostra o erro e mantém em /login', async ({ page }) => {
    await mockLogin401(page);
    await preencherLogin(page, 'aluno.teste@catolicasc.edu.br', 'errada');

    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
    await expect(page).toHaveURL(/\/login$/);
    expect(await tokenAtual(page)).toBeNull();
  });
});

test.describe('login com backend real', { tag: '@backend' }, () => {
  test.skip(!process.env['E2E_BACKEND'], 'defina E2E_BACKEND=1 com o quarkus:dev no ar');

  test('usuário semente ALUNO faz login e vê a sidebar sem itens de moderação', async ({
    page,
  }) => {
    await preencherLogin(page, 'aluno.teste@catolicasc.edu.br', 'Senha123!');

    await expect(page).toHaveURL(/\/feed$/);
    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav.getByText('Início')).toBeVisible();
    await expect(nav.getByText('Denúncias')).toHaveCount(0);
    await expect(nav.getByText('Solicitações de fixação')).toHaveCount(0);
  });
});
