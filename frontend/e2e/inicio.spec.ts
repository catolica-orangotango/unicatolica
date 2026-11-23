import { expect, test } from '@playwright/test';
import { mockComunidadeComFeed, mockFeedOk, mockMinhasComunidades } from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * Início (`/feed`) com as publicações reais da comunidade do curso (KAN-93): o mesmo feed e
 * a mesma caixa de postar da tela da comunidade. Backend mockado via `page.route()`.
 */

const POSTAGEM = {
  id: 1,
  comunidadeId: 14,
  autor: { id: 50, nome: 'Ana Lima', curso: 'Engenharia de Software' },
  conteudo: 'Prova de Cálculo adiada para sexta.',
  criadoEm: new Date(Date.now() - 5 * 60_000).toISOString(),
};

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
  await plantarToken(page, ['ALUNO']);
});

test('mostra as publicações da comunidade do curso e permite publicar no topo', async ({ page }) => {
  await mockMinhasComunidades(page, [{ id: 14, nome: 'Engenharia de Software', tipo: 'CURSO' }]);
  await mockComunidadeComFeed(page, {
    id: 14,
    nome: 'Engenharia de Software',
    tipo: 'CURSO',
    souMembro: true,
    publicacoes: [POSTAGEM],
  });
  await page.goto('/feed');

  await expect(page.getByRole('heading', { name: 'Publicações de Engenharia de Software' })).toBeVisible();
  await expect(page.getByText('chegam em breve')).toHaveCount(0);
  const posts = page.locator('.feed__post');
  await expect(posts).toHaveCount(1);
  await expect(posts.first()).toContainText('Prova de Cálculo adiada para sexta.');

  await page.getByLabel('Escreva uma postagem').fill('Alguém tem o resumo da aula 3?');
  await page.getByRole('button', { name: 'Publicar' }).click();

  await expect(posts).toHaveCount(2);
  await expect(posts.first()).toContainText('Alguém tem o resumo da aula 3?');
  await expect(page.getByText('Postagem publicada')).toBeVisible();
});

test('sem nenhuma comunidade, convida a participar de uma', async ({ page }) => {
  await page.goto('/feed');

  await expect(page.getByText('Você ainda não participa de nenhuma comunidade.')).toBeVisible();
  await expect(page.getByLabel('Escreva uma postagem')).toHaveCount(0);
});
