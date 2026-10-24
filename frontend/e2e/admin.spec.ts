import { expect, test } from '@playwright/test';
import { mockCursosAdmin, mockFeedOk } from './support/mocks';
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

test.describe('Cursos (KAN-44)', () => {
  const CURSOS = [
    { id: 1, nome: 'Administração', ativo: true },
    { id: 2, nome: 'Direito', ativo: true },
  ];

  test('pelo painel, administrador abre a tela de Cursos', async ({ page }) => {
    await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin');

    await page.getByRole('link', { name: 'Cursos' }).click();

    await expect(page).toHaveURL(/\/admin\/cursos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cursos' })).toBeVisible();
    await expect(page.getByText('Direito', { exact: true })).toBeVisible();
  });

  test('cadastra um curso e ele aparece no cadastro de aluno', async ({ page }) => {
    const chamadas = await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin/cursos');

    await page.getByLabel('Nome do curso').fill('Curso Teste');
    await page.getByRole('button', { name: 'Cadastrar curso' }).click();

    await expect(page.getByText('Curso Curso Teste cadastrado')).toBeVisible();
    await expect(page.getByText('Curso Teste', { exact: true })).toBeVisible();
    expect(chamadas).toEqual([{ metodo: 'POST', caminho: '/cursos', corpo: { nome: 'Curso Teste' } }]);

    await page.goto('/cadastro');
    await expect(page.getByLabel('Curso').locator('option', { hasText: 'Curso Teste' })).toHaveCount(1);
  });

  test('nome já usado mostra o erro da API', async ({ page }) => {
    await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin/cursos');

    await page.getByLabel('Nome do curso').fill('direito');
    await page.getByRole('button', { name: 'Cadastrar curso' }).click();

    await expect(page.getByRole('alert')).toContainText('Já existe um curso com esse nome.');
  });

  test('renomeia e depois desativa: o curso some do cadastro de aluno', async ({ page }) => {
    const chamadas = await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin/cursos');

    await page.getByRole('button', { name: 'Renomear Direito' }).click();
    await page.getByLabel('Novo nome de Direito').fill('Direito Noturno');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Direito Noturno', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Desativar Direito Noturno' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Inativo')).toBeVisible();

    expect(chamadas.map((c) => [c.metodo, c.caminho, c.corpo])).toEqual([
      ['PUT', '/cursos/2', { nome: 'Direito Noturno', ativo: true }],
      ['PUT', '/cursos/2', { nome: 'Direito Noturno', ativo: false }],
    ]);

    await page.goto('/cadastro');
    await expect(page.getByLabel('Curso').locator('option', { hasText: 'Direito Noturno' })).toHaveCount(0);
  });

  test('aluno que digita /admin/cursos volta para o Início', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/admin/cursos');

    await expect(page).toHaveURL(/\/feed$/);
  });
});
