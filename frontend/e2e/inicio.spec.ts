import { expect, test } from '@playwright/test';
import { mockAvisosInicio, mockComunidadeComFeed, mockFeedOk, mockMinhasComunidades } from './support/mocks';
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

test('mostra "Esta semana" com os avisos que valem para o aluno (Story 13.2)', async ({ page }) => {
  await mockAvisosInicio(page, [
    { id: 2, titulo: 'Palestra de carreira', mensagem: 'Auditório 2, quarta às 19h.', escopo: 'CURSO', cursoId: 14, cursoNome: 'Engenharia de Software', dataDestaque: '2026-12-09', criadoEm: '2026-11-25T12:00:00Z' },
    { id: 1, titulo: 'Feriado na segunda', mensagem: 'Sem aula.', escopo: 'GERAL', cursoId: null, cursoNome: null, dataDestaque: null, criadoEm: '2026-11-24T12:00:00Z' },
  ]);
  await page.goto('/feed');

  await expect(page.getByRole('heading', { name: 'Esta semana' })).toBeVisible();
  const itens = page.locator('.home__aviso-item');
  await expect(itens).toHaveCount(2);
  await expect(itens.first()).toContainText('Palestra de carreira');
  await expect(itens.first()).toContainText('Engenharia de Software · 09/12');
  await expect(itens.nth(1)).toContainText('Todos os cursos · 24/11');
});

test('sem avisos o Início não mostra "Esta semana"', async ({ page }) => {
  await page.goto('/feed');

  await expect(page.getByRole('heading', { name: 'Descubra comunidades' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Esta semana' })).toHaveCount(0);
});
