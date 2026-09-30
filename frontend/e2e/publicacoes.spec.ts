import { expect, test } from '@playwright/test';
import { mockComunidadeComFeed, mockFeedOk } from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * Feed da comunidade e caixa de postar (Stories 3.1/3.2, KAN-27/KAN-28) na
 * "Home da comunidade" `/comunidades/:id`. Backend mockado via `page.route()`
 * (`mockComunidadeComFeed`), no mesmo formato do `openapi.yaml`.
 */

const POSTAGEM_EXISTENTE = {
  id: 1,
  comunidadeId: 27,
  autor: { id: 50, nome: 'Ana Lima', curso: 'Engenharia de Software' },
  conteudo: 'Alguém para uma partida na quinta?',
  criadoEm: new Date(Date.now() - 5 * 60_000).toISOString(),
};

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
  await plantarToken(page, ['ALUNO']);
});

test('membro publica e a postagem aparece no topo do feed', async ({ page }) => {
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    publicacoes: [POSTAGEM_EXISTENTE],
  });
  await page.goto('/comunidades/27');

  const posts = page.locator('.feed__post');
  await expect(posts).toHaveCount(1);
  await expect(posts.first()).toContainText('Ana Lima');
  await expect(posts.first()).toContainText('há 5 min');

  const publicar = page.getByRole('button', { name: 'Publicar' });
  await expect(publicar).toBeDisabled();

  await page.getByLabel('Escreva uma postagem').fill('Tabuleiros novos na sala 204!');
  await publicar.click();

  await expect(posts).toHaveCount(2);
  await expect(posts.first()).toContainText('Tabuleiros novos na sala 204!');
  await expect(posts.first()).toContainText('Usuário Teste');
  await expect(page.getByLabel('Escreva uma postagem')).toHaveValue('');
  await expect(page.getByText('Postagem publicada')).toBeVisible();

  // Recarregar busca do "backend" de novo: a postagem continua lá, no topo.
  await page.reload();
  await expect(posts).toHaveCount(2);
  await expect(posts.first()).toContainText('Tabuleiros novos na sala 204!');
});

test('não-membro lê o feed, mas não vê a caixa de postar (RF27.1)', async ({ page }) => {
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: false,
    publicacoes: [POSTAGEM_EXISTENTE],
  });
  await page.goto('/comunidades/27');

  await expect(page.locator('.feed__post')).toHaveCount(1);
  await expect(page.getByLabel('Escreva uma postagem')).toHaveCount(0);
  await expect(page.getByText('Participe da comunidade para publicar.')).toBeVisible();
});

test('comunidade sem postagens mostra o estado vazio', async ({ page }) => {
  await mockComunidadeComFeed(page, { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
  await page.goto('/comunidades/27');

  await expect(page.getByText('Nenhuma postagem ainda. Que tal começar a conversa?')).toBeVisible();
});
