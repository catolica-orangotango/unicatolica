import { expect, test } from '@playwright/test';
import { esperarSemViolacoes } from './support/acessibilidade';
import { mockAdminUsuarios, mockFeedOk, UsuarioAdminMock } from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * Tela "Usuários" de /admin (KAN-83): listar, buscar, promover e desativar. Sem backend, com JWT de
 * ADMINISTRADOR plantado; as regras do servidor (409, sessão derrubada) são testadas no backend.
 */

function usuarios(): UsuarioAdminMock[] {
  return [
    { id: 2, nomeCompleto: 'Ana Aluna', email: 'ana@catolicasc.edu.br', curso: 'Administração', perfil: 'ALUNO', ativo: true },
    { id: 3, nomeCompleto: 'Beto Moderador', email: 'beto@catolicasc.edu.br', curso: null, perfil: 'MODERADOR', ativo: true },
  ];
}

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
  await plantarToken(page, ['ADMINISTRADOR']);
});

test('pelo painel, abre a lista de usuários com perfil e situação em texto', async ({ page }) => {
  await mockAdminUsuarios(page, usuarios());
  await page.goto('/admin');

  await page.getByRole('link', { name: 'Usuários' }).click();

  await expect(page).toHaveURL(/\/admin\/usuarios$/);
  await expect(page).toHaveTitle('Usuários — UniCatólica');
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
  const ana = page.getByRole('row', { name: /Ana Aluna/ });
  await expect(ana).toContainText('Aluno');
  await expect(ana).toContainText('Ativa');
  await expect(page.getByRole('row', { name: /Beto Moderador/ })).toContainText('Moderador');
  await esperarSemViolacoes(page);
});

test('busca por nome e filtra por perfil', async ({ page }) => {
  await mockAdminUsuarios(page, usuarios());
  await page.goto('/admin/usuarios');

  await page.getByLabel('Buscar por nome ou e-mail').fill('beto@');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByRole('row', { name: /Beto Moderador/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Ana Aluna/ })).toHaveCount(0);

  await page.getByLabel('Buscar por nome ou e-mail').fill('');
  await page.getByLabel('Perfil', { exact: true }).selectOption('ALUNO');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByRole('row', { name: /Ana Aluna/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /Beto Moderador/ })).toHaveCount(0);
});

test('promove um aluno a moderador só depois de confirmar', async ({ page }) => {
  const chamadas = await mockAdminUsuarios(page, usuarios());
  await page.goto('/admin/usuarios');

  await page.getByRole('button', { name: 'Alterar perfil de Ana Aluna' }).click();
  await expect(page.getByRole('button', { name: 'Confirmar alteração' })).toBeFocused();
  await expect(page.getByText('Ana Aluna precisará entrar de novo.')).toBeVisible();
  expect(chamadas).toEqual([]);

  await page.getByLabel('Novo perfil').selectOption('MODERADOR');
  await page.getByRole('button', { name: 'Confirmar alteração' }).click();

  await expect(page.getByRole('row', { name: /Ana Aluna/ })).toContainText('Moderador');
  await expect(page.getByText('Perfil de Ana Aluna alterado para Moderador.')).toBeVisible();
  expect(chamadas).toEqual([
    { metodo: 'PUT', caminho: '/admin/usuarios/2/perfil', corpo: { perfil: 'MODERADOR' } },
  ]);
});

test('desativa e reativa uma conta, com a situação em texto na linha', async ({ page }) => {
  const chamadas = await mockAdminUsuarios(page, usuarios());
  await page.goto('/admin/usuarios');
  const ana = page.getByRole('row', { name: /Ana Aluna/ });

  await page.getByRole('button', { name: 'Desativar conta de Ana Aluna' }).click();
  await expect(page.getByRole('button', { name: 'Confirmar desativação' })).toBeFocused();
  expect(chamadas).toEqual([]);
  await page.getByRole('button', { name: 'Confirmar desativação' }).click();

  await expect(ana).toContainText('Desativada');
  await page.getByRole('button', { name: 'Reativar conta de Ana Aluna' }).click();
  await expect(ana).toContainText('Ativa');
  expect(chamadas.map((c) => c.corpo)).toEqual([{ ativo: false }, { ativo: true }]);
});

test('aluno e moderador que digitam /admin/usuarios voltam para o Início', async ({ page }) => {
  for (const perfil of ['ALUNO', 'MODERADOR']) {
    const novaPagina = await page.context().newPage();
    await mockFeedOk(novaPagina);
    await plantarToken(novaPagina, [perfil]);
    await novaPagina.goto('/admin/usuarios');

    await expect(novaPagina).toHaveURL(/\/feed$/);
    await novaPagina.close();
  }
});
