import { expect, test } from '@playwright/test';
import { mockComunidadeComFeed, mockCriarComunidade, mockFeedOk } from './support/mocks';
import { plantarToken } from './support/seed';

/** Criar comunidade aberta (Story 2.2, KAN-22). Backend mockado no formato do `openapi.yaml`. */

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
  await plantarToken(page, ['ALUNO']);
});

test('pela lista de descoberta, cria uma comunidade aberta e cai na Home dela', async ({ page }) => {
  const recebidas = await mockCriarComunidade(page, { id: 42 });
  await mockComunidadeComFeed(page, { id: 42, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
  await page.goto('/comunidades');

  await page.getByRole('button', { name: 'Criar comunidade' }).click();
  await expect(page).toHaveURL(/\/comunidades\/nova$/);

  await page.getByLabel('Nome').fill('Clube de Xadrez');
  await page.getByLabel('Descrição').fill('Partidas às quintas');
  await page.getByRole('button', { name: 'Criar comunidade' }).click();

  await expect(page).toHaveURL(/\/comunidades\/42$/);
  await expect(page.getByText('Comunidade Clube de Xadrez criada')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clube de Xadrez' })).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Clube de Xadrez' })).toBeVisible();
  expect(recebidas).toEqual([{ nome: 'Clube de Xadrez', descricao: 'Partidas às quintas' }]);
});

test('nome já em uso mostra o aviso e continua no formulário', async ({ page }) => {
  await mockCriarComunidade(page, { id: 42, nomesEmUso: ['Clube de Xadrez'] });
  await page.goto('/comunidades/nova');

  await page.getByLabel('Nome').fill('Clube de Xadrez');
  await page.getByRole('button', { name: 'Criar comunidade' }).click();

  await expect(page.getByRole('alert')).toHaveText('Já existe uma comunidade com esse nome.');
  await expect(page).toHaveURL(/\/comunidades\/nova$/);
});

test('sem nome não envia e aponta o campo', async ({ page }) => {
  const recebidas = await mockCriarComunidade(page, { id: 42 });
  await page.goto('/comunidades/nova');

  await page.getByRole('button', { name: 'Criar comunidade' }).click();

  await expect(page.getByText('Informe o nome da comunidade.')).toBeVisible();
  await expect(page.getByLabel('Nome')).toHaveAttribute('aria-invalid', 'true');
  expect(recebidas).toEqual([]);
});
