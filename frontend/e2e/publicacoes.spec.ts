import { expect, test } from '@playwright/test';
import { mockComunidadeComFeed, mockEnviarArquivo, mockFeedOk } from './support/mocks';
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

test('anexa um PDF, remove, anexa de novo e publica com o arquivo no card', async ({ page }) => {
  await mockComunidadeComFeed(page, { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
  const enviados = await mockEnviarArquivo(page);
  await page.goto('/comunidades/27');

  const seletor = page.locator('input[type="file"]');
  await seletor.setInputFiles({ name: 'edital.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste') });
  await expect(page.getByText('edital.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Remover anexo' }).click();
  await expect(page.getByText('edital.pdf')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Anexar arquivo' })).toBeFocused();

  await seletor.setInputFiles({ name: 'edital.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste') });
  await page.getByLabel('Escreva uma postagem').fill('Edital novo');
  await page.getByRole('button', { name: 'Publicar' }).click();

  const link = page.locator('.feed__post a.feed__anexo-link');
  await expect(link).toContainText('edital.pdf');
  await expect(link).toHaveAttribute('target', '_blank');
  expect(enviados).toEqual([{ finalidade: 'ANEXO_POSTAGEM', nome: 'edital.pdf' }]);
  await expect(page.getByText('Postagem publicada')).toBeVisible();
});

test('imagem anexada aparece como <img> com o nome em alt; formato inválido mostra os aceitos', async ({ page }) => {
  await mockComunidadeComFeed(page, { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
  await mockEnviarArquivo(page);
  await page.goto('/comunidades/27');

  const seletor = page.locator('input[type="file"]');
  await seletor.setInputFiles({ name: 'animado.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
  await expect(page.getByRole('alert')).toContainText('PNG, JPEG ou PDF');

  await seletor.setInputFiles({ name: 'tabuleiro.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await page.getByLabel('Escreva uma postagem').fill('Foto do tabuleiro');
  await page.getByRole('button', { name: 'Publicar' }).click();

  await expect(page.locator('.feed__post img.feed__anexo-imagem')).toHaveAttribute('alt', 'tabuleiro.png');
});

test('autor exclui a própria postagem: confirma na linha e ela some do feed (KAN-137)', async ({ page }) => {
  await plantarToken(page, ['ALUNO'], '1'); // o autor das postagens do mock é o usuário 1
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    publicacoes: [
      { ...POSTAGEM_EXISTENTE, id: 2, autor: { id: 1, nome: 'Usuário Teste', curso: null }, conteudo: 'Publiquei sem querer' },
      POSTAGEM_EXISTENTE,
    ],
  });
  await page.goto('/comunidades/27');

  const posts = page.locator('.feed__post');
  await expect(posts).toHaveCount(2);
  // Só a própria postagem tem "Excluir"; a de Ana Lima tem "Denunciar".
  await expect(page.getByRole('button', { name: 'Excluir postagem' })).toHaveCount(1);
  await expect(posts.nth(1).getByRole('button', { name: 'Denunciar' })).toBeVisible();

  const dialogo = page.getByRole('dialog', { name: 'Excluir esta postagem?' });
  const excluir = page.getByRole('button', { name: 'Excluir postagem' });

  // O modal abre em destaque, com o trecho da postagem e o foco em "Cancelar".
  await excluir.click();
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toContainText('não dá para desfazer');
  await expect(dialogo).toContainText('Publiquei sem querer');
  await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();

  // Escape, clique no fundo e Cancelar fecham sem excluir e devolvem o foco ao "Excluir".
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);
  await expect(excluir).toBeFocused();
  await excluir.click();
  await expect(dialogo).toBeVisible();
  await page.mouse.click(5, 5); // fundo escurecido, fora do modal
  await expect(dialogo).toHaveCount(0);
  await excluir.click();
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(posts).toHaveCount(2);

  await excluir.click();
  await dialogo.getByRole('button', { name: 'Excluir' }).click();

  await expect(posts).toHaveCount(1);
  await expect(page.getByText('Publiquei sem querer')).toHaveCount(0);
  await expect(page.getByText('Postagem excluída')).toBeVisible();

  // Recarregar busca do "backend" de novo: a postagem excluída não volta.
  await page.reload();
  await expect(posts).toHaveCount(1);
});
