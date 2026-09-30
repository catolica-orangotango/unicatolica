import { expect, test } from '@playwright/test';
import {
  mockComunidadeComFeed,
  mockCursosOk,
  mockFeedOk,
  mockMeuPerfil,
  mockPerfilDeUsuario,
} from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * Telas do Perfil Acadêmico (Stories 4.1, 4.2 e 4.4; KAN-39, KAN-40, KAN-42): próprio
 * perfil pelo menu da conta e perfil de outro usuário pelo autor de uma postagem.
 * Backend mockado via `page.route()`, no formato do `openapi.yaml`.
 */

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
  await mockCursosOk(page);
  await plantarToken(page, ['ALUNO']);
});

test('pelo menu da conta, completa o perfil e ele continua salvo depois de recarregar', async ({ page }) => {
  await mockMeuPerfil(page, { usuarioId: 1, nome: 'Usuário Teste', curso: null, periodo: null, interesses: [] });
  await page.goto('/feed');

  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await page.getByRole('menuitem', { name: 'Perfil' }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Complete seu perfil' })).toBeVisible();

  await page.getByLabel('Curso').selectOption({ label: 'Engenharia de Software' });
  await page.getByLabel('Período').selectOption({ label: '3º semestre' });
  await page.getByLabel('Interesses').fill('Robótica');
  await page.getByLabel('Interesses').press('Enter');
  await page.getByLabel('Interesses').fill('Java');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Perfil salvo')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Usuário Teste' })).toBeVisible();
  await expect(page.getByText('3º semestre')).toBeVisible();
  await expect(page.locator('.cartao__interesse')).toHaveText(['Java', 'Robótica']);

  await page.reload();
  await expect(page.getByText('Engenharia de Software')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar perfil' })).toBeVisible();
});

test('clicar no autor de uma postagem abre o perfil dele, somente leitura', async ({ page }) => {
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    publicacoes: [
      {
        id: 1,
        comunidadeId: 27,
        autor: { id: 50, nome: 'Ana Lima', curso: 'Engenharia de Software' },
        conteudo: 'Alguém para uma partida na quinta?',
        criadoEm: new Date().toISOString(),
      },
    ],
  });
  await mockPerfilDeUsuario(page, {
    usuarioId: 50,
    nome: 'Ana Lima',
    curso: { id: 14, nome: 'Engenharia de Software' },
    periodo: 5,
    interesses: ['Xadrez'],
  });
  await page.goto('/comunidades/27');

  await page.getByRole('link', { name: 'Ana Lima' }).click();

  await expect(page).toHaveURL(/\/usuarios\/50$/);
  await expect(page.getByRole('heading', { name: 'Ana Lima' })).toBeVisible();
  await expect(page.getByText('5º semestre')).toBeVisible();
  await expect(page.getByText('Xadrez')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar perfil' })).toHaveCount(0);
});
