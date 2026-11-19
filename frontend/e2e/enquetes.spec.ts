import { expect, test } from '@playwright/test';
import {
  EnqueteMock,
  mockComunidadeComFeed,
  mockCriarEnquete,
  mockFeedOk,
  mockMinhasComunidades,
  mockVotarEnquete,
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
    jaVotei: false,
    resultado: null,
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

/** Votar em enquete (Story 8.3, KAN-112). */

function enqueteComOpcoes(id: number, comunidadeId: number, extra: Partial<EnqueteMock> = {}): EnqueteMock {
  return {
    ...ativa(id, comunidadeId),
    pergunta: 'Melhor dia?',
    opcoes: [{ id: id * 10, texto: 'Segunda' }, { id: id * 10 + 1, texto: 'Terça' }, { id: id * 10 + 2, texto: 'Quarta' }],
    ...extra,
  };
}

test('membro escolhe uma opção, vota e a tela confirma sem mostrar resultado', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    enquetes: [enqueteComOpcoes(5, 27)],
  });
  const votos = await mockVotarEnquete(page);
  await page.goto('/comunidades/27');

  await expect(page.getByRole('radiogroup', { name: 'Melhor dia?' })).toBeVisible();
  await page.getByLabel('Terça').check();
  await page.getByRole('button', { name: 'Votar' }).click();

  await expect(page.getByText('Voto registrado')).toBeVisible();
  await expect(page.getByText('Você já votou nesta enquete.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Votar' })).toHaveCount(0);
  expect(votos).toEqual([{ enqueteId: 5, opcaoIds: [51] }]);
});

test('vota só pelo teclado, com foco visível em cada controle', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    enquetes: [enqueteComOpcoes(5, 27)],
  });
  const votos = await mockVotarEnquete(page);
  await page.goto('/comunidades/27');

  const segunda = page.getByLabel('Segunda');
  await segunda.focus();
  await expect(segunda).toBeFocused();
  const outline = await segunda.evaluate((el) => {
    const s = getComputedStyle(el);
    return { estilo: s.outlineStyle, largura: s.outlineWidth };
  });
  expect(outline.estilo !== 'none' && outline.largura !== '0px').toBe(true);

  await page.keyboard.press('Space');
  await expect(segunda).toBeChecked();
  const votar = page.getByRole('button', { name: 'Votar' });
  await votar.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByText('Você já votou nesta enquete.')).toBeVisible();
  expect(votos).toEqual([{ enqueteId: 5, opcaoIds: [50] }]);
});

test('escolha múltipla trava as demais opções no limite e envia as marcadas', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    enquetes: [enqueteComOpcoes(6, 27, { tipo: 'MULTIPLA', limiteSelecao: 2 })],
  });
  const votos = await mockVotarEnquete(page);
  await page.goto('/comunidades/27');

  await page.getByLabel('Segunda').check();
  await page.getByLabel('Quarta').check();
  await expect(page.getByLabel('Terça')).toBeDisabled();

  await page.getByRole('button', { name: 'Votar' }).click();
  await expect(page.getByText('Você já votou nesta enquete.')).toBeVisible();
  expect(votos).toEqual([{ enqueteId: 6, opcaoIds: [60, 62] }]);
});

test('sem escolher nenhuma opção não envia e o aviso é anunciado', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    enquetes: [enqueteComOpcoes(5, 27)],
  });
  const votos = await mockVotarEnquete(page);
  await page.goto('/comunidades/27');

  await page.getByRole('button', { name: 'Votar' }).click();

  await expect(page.getByRole('alert')).toHaveText('Escolha uma opção para votar.');
  expect(votos).toEqual([]);
});

test('quem não é membro vê as opções e o aviso, sem poder votar (RF55.1)', async ({ page }) => {
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: false,
    enquetes: [enqueteComOpcoes(5, 27)],
  });
  await page.goto('/comunidades/27');

  await expect(page.getByText('Só membros da comunidade podem votar nesta enquete.')).toBeVisible();
  await expect(page.getByText('Terça')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Votar' })).toHaveCount(0);
});

test('enquete em que já votou aparece sem opção de votar de novo (RF56.1)', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    enquetes: [enqueteComOpcoes(5, 27, { jaVotei: true })],
  });
  await page.goto('/comunidades/27');

  await expect(page.getByText('Você já votou nesta enquete.')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
});

test('votou e a enquete tem 5 votos ou mais: mostra o resultado em barras (RF57, RF58)', async ({ page }) => {
  const enquete = enqueteComOpcoes(5, 27, { jaVotei: true });
  const [a, b] = enquete.opcoes;
  enquete.resultado = {
    totalVotantes: 5,
    votosNecessarios: 5,
    liberado: true,
    opcoes: [
      { opcaoId: a.id, votos: 4 },
      { opcaoId: b.id, votos: 1 },
    ],
  };
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true, enquetes: [enquete] });
  await page.goto('/comunidades/27');

  await expect(page.getByText('4 votos (80%)')).toBeVisible();
  await expect(page.getByText('1 voto (20%)')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
});

test('votou mas há menos de 5 votos: mostra "X de 5 votos necessários" no lugar do resultado (RF58.1)', async ({ page }) => {
  const enquete = enqueteComOpcoes(5, 27, { jaVotei: true });
  enquete.resultado = { totalVotantes: 3, votosNecessarios: 5, liberado: false, opcoes: [] };
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true, enquetes: [enquete] });
  await page.goto('/comunidades/27');

  await expect(page.getByText('3 de 5 votos necessários para mostrar o resultado.')).toBeVisible();
  await expect(page.getByText(/\d+ votos? \(/)).toHaveCount(0);
});

test('enquete encerrada ou ocultada não aceita voto', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    enquetes: [enqueteComOpcoes(5, 27, { situacao: 'OCULTA' })],
  });
  await page.goto('/comunidades/27');

  await expect(page.getByText('Esta enquete não aceita mais votos.')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
});

test('o servidor recusa o voto (422) e a tela mostra o motivo, mantendo a escolha', async ({ page }) => {
  await mockMinhasComunidades(page, COMUNIDADES);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    enquetes: [enqueteComOpcoes(5, 27)],
  });
  await mockVotarEnquete(page, {
    erro: { status: 422, code: 'OPCAO_INVALIDA', message: 'Escolha apenas opções desta enquete.' },
  });
  await page.goto('/comunidades/27');

  await page.getByLabel('Segunda').check();
  await page.getByRole('button', { name: 'Votar' }).click();

  await expect(page.getByRole('alert')).toHaveText('Escolha apenas opções desta enquete.');
  await expect(page.getByLabel('Segunda')).toBeChecked();
});
