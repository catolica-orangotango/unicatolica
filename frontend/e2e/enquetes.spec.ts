import { expect, test } from '@playwright/test';
import {
  EnqueteMock,
  mockComunidadeComFeed,
  mockCriarEnquete,
  mockFeedOk,
  mockMinhasComunidades,
} from './support/mocks';
import { plantarToken } from './support/seed';

/** Criar enquete (Story 8.1, KAN-110). Backend mockado no formato do `openapi.yaml`. */

const COMUNIDADES = [
  { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA' as const },
  { id: 28, nome: 'Corrida de Rua', tipo: 'ABERTA' as const },
];

function ativa(id: number, comunidadeId: number): EnqueteMock {
  return {
    id,
    comunidadeId,
    autor: { id: 1, nome: 'Usuário Teste', curso: null },
    pergunta: `Enquete ${id}?`,
    tipo: 'UNICA',
    limiteSelecao: null,
    opcoes: [{ id: 1, texto: 'Sim' }, { id: 2, texto: 'Não' }],
    situacao: 'ATIVA',
    criadaEm: '2026-11-19T12:00:00Z',
  };
}

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
  await plantarToken(page, ['ALUNO']);
});

test('pelo menu, cria uma enquete de escolha única e cai na comunidade', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  const recebidas = await mockCriarEnquete(page);
  await mockComunidadeComFeed(page, { id: 28, nome: 'Corrida de Rua', tipo: 'ABERTA', souMembro: true });
  await page.goto('/feed');

  await page.getByRole('navigation').getByRole('link', { name: 'Criar enquete' }).click();
  await expect(page).toHaveURL(/\/enquetes\/nova$/);
  await expect(page).toHaveTitle('Criar enquete — UniCatólica');

  await page.getByLabel('Comunidade', { exact: true }).selectOption({ label: 'Corrida de Rua' });
  await page.getByLabel('Pergunta').fill('Melhor dia para o treino?');
  await page.getByLabel('Opção 1', { exact: true }).fill('Segunda');
  await page.getByLabel('Opção 2', { exact: true }).fill('Quarta');
  await page.getByRole('button', { name: 'Criar enquete' }).click();

  await expect(page).toHaveURL(/\/comunidades\/28$/);
  await expect(page.getByText('Enquete criada')).toBeVisible();
  expect(recebidas).toEqual([
    {
      comunidadeId: 28,
      corpo: { pergunta: 'Melhor dia para o treino?', tipo: 'UNICA', limiteSelecao: null, opcoes: ['Segunda', 'Quarta'] },
    },
  ]);
});

test('escolha múltipla pede o limite e o envia', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  const recebidas = await mockCriarEnquete(page);
  await mockComunidadeComFeed(page, { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
  await page.goto('/enquetes/nova');

  await page.getByLabel('Comunidade', { exact: true }).selectOption({ label: 'Clube de Xadrez' });
  await page.getByLabel('Pergunta').fill('Quais dias?');
  await page.getByLabel('Escolha múltipla').check();
  await page.getByRole('button', { name: 'Adicionar opção' }).click();
  await page.getByLabel('Opção 1', { exact: true }).fill('Segunda');
  await page.getByLabel('Opção 2', { exact: true }).fill('Terça');
  await page.getByLabel('Opção 3', { exact: true }).fill('Quarta');

  await page.getByRole('button', { name: 'Criar enquete' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Informe quantas opções' })).toBeVisible();
  expect(recebidas).toEqual([]);

  await page.getByLabel('Quantas opções cada pessoa pode escolher').selectOption({ label: 'Até 2' });
  await page.getByRole('button', { name: 'Criar enquete' }).click();

  await expect(page).toHaveURL(/\/comunidades\/27$/);
  expect(recebidas[0].corpo).toEqual({ pergunta: 'Quais dias?', tipo: 'MULTIPLA', limiteSelecao: 2, opcoes: ['Segunda', 'Terça', 'Quarta'] });
});

test('comunidade com duas enquetes ativas aparece desabilitada (RF53.3)', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockCriarEnquete(page, { ativas: [ativa(1, 27), ativa(2, 27)] });
  await page.goto('/enquetes/nova');

  await expect(page.getByRole('option', { name: /Clube de Xadrez/ })).toBeDisabled();
  await expect(page.getByRole('option', { name: /Clube de Xadrez/ })).toContainText('limite de 2 enquetes ativas');
  await expect(page.getByRole('option', { name: 'Corrida de Rua' })).toBeEnabled();
});

test('opção em branco não envia e o erro é anunciado', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  const recebidas = await mockCriarEnquete(page);
  await page.goto('/enquetes/nova');

  await page.getByLabel('Comunidade', { exact: true }).selectOption({ label: 'Corrida de Rua' });
  await page.getByLabel('Pergunta').fill('Melhor dia?');
  await page.getByLabel('Opção 1', { exact: true }).fill('Segunda');
  await page.getByRole('button', { name: 'Criar enquete' }).click();

  await expect(page.getByLabel('Opção 2', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toHaveText('Preencha a opção 2 ou remova-a.');
  expect(recebidas).toEqual([]);
});

test('limite de opções: de 2 a 5', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockCriarEnquete(page);
  await page.goto('/enquetes/nova');

  await expect(page.getByRole('button', { name: /^Remover opção/ })).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Remover opção 1' })).toBeDisabled();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Adicionar opção' }).click();
  }
  await expect(page.getByRole('button', { name: 'Adicionar opção' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Remover opção/ })).toHaveCount(5);
});

test('o servidor recusa por limite de ativas (409) e a tela mostra o motivo', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockCriarEnquete(page, { conflito: true });
  await page.goto('/enquetes/nova');

  await page.getByLabel('Comunidade', { exact: true }).selectOption({ label: 'Corrida de Rua' });
  await page.getByLabel('Pergunta').fill('Melhor dia?');
  await page.getByLabel('Opção 1', { exact: true }).fill('Segunda');
  await page.getByLabel('Opção 2', { exact: true }).fill('Terça');
  await page.getByRole('button', { name: 'Criar enquete' }).click();

  await expect(page.getByRole('alert')).toHaveText('Você já tem 2 enquetes ativas nesta comunidade.');
  await expect(page).toHaveURL(/\/enquetes\/nova$/);
});

test('sem comunidade, oferece conhecer comunidades em vez do formulário', async ({ page }) => {
  await mockCriarEnquete(page);
  await page.goto('/enquetes/nova');

  await expect(page.getByRole('link', { name: 'Conhecer comunidades' })).toBeVisible();
  await expect(page.getByLabel('Pergunta')).toHaveCount(0);
});

test('a enquete criada aparece na Home da comunidade', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    enquetes: [{ ...ativa(5, 27), pergunta: 'Qual abertura estudar?', opcoes: [{ id: 1, texto: 'Italiana' }, { id: 2, texto: 'Siciliana' }] }],
  });
  await page.goto('/comunidades/27');

  await expect(page.getByRole('heading', { name: 'Enquetes' })).toBeVisible();
  await expect(page.getByText('Qual abertura estudar?')).toBeVisible();
  await expect(page.getByText('Escolha única')).toBeVisible();
  await expect(page.getByText('Siciliana')).toBeVisible();
});
