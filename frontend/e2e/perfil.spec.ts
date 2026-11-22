import { expect, test } from '@playwright/test';
import {
  mockComunidadeComFeed,
  mockCursosOk,
  mockEnviarArquivo,
  mockFeedOk,
  mockMeuPerfil,
  mockPerfilDeUsuario,
} from './support/mocks';
import { cartaoDaConta } from './support/casca';
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

  await cartaoDaConta(page).click();
  await page.getByRole('menuitem', { name: 'Perfil' }).click();
  await expect(page).toHaveURL(/\/perfil$/);
  await expect(page.getByRole('heading', { name: 'Complete seu perfil' })).toBeVisible();

  await page.getByLabel('Curso').selectOption({ label: 'Engenharia de Software' });
  await page.getByLabel('Período').selectOption({ label: '3º semestre' });
  await page.getByRole('textbox', { name: 'Interesses' }).fill('Robótica');
  await page.getByRole('textbox', { name: 'Interesses' }).press('Enter');
  await page.getByRole('textbox', { name: 'Interesses' }).fill('Java');
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

test('envia e remove a foto de perfil; o foco volta a "Alterar foto" ao remover', async ({ page }) => {
  const enviados = await mockEnviarArquivo(page);
  const { fotos } = await mockMeuPerfil(page, {
    usuarioId: 1,
    nome: 'Usuário Teste',
    curso: { id: 14, nome: 'Engenharia de Software' },
    periodo: 3,
    interesses: [],
    fotoUrl: null,
  });
  await page.goto('/perfil');
  await expect(page.getByRole('button', { name: 'Remover foto' })).toHaveCount(0);

  // PDF é recusado no navegador, com os formatos aceitos.
  await page.locator('input[type="file"]').setInputFiles({
    name: 'edital.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await expect(page.getByRole('alert')).toContainText('PNG ou JPEG');
  expect(enviados).toHaveLength(0);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'eu.png',
    mimeType: 'image/png',
    buffer: Buffer.from('png'),
  });
  await expect(page.getByText('Foto atualizada')).toBeVisible();
  await expect(page.locator('app-perfil-cartao uc-avatar img')).toBeVisible();
  expect(enviados).toEqual([{ finalidade: 'FOTO_PERFIL', nome: 'eu.png' }]);
  expect(fotos).toEqual([{ metodo: 'PUT', arquivoId: 500 }]);

  await page.getByRole('button', { name: 'Remover foto' }).click();
  await expect(page.locator('app-perfil-cartao uc-avatar img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Alterar foto' })).toBeFocused();
  expect(fotos.at(-1)).toEqual({ metodo: 'DELETE' });
});
