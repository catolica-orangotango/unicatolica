import { expect, test } from '@playwright/test';
import {
  MembroMock,
  mockAdministrarComunidade,
  mockComunidadeComFeed,
  mockCriarComunidade,
  mockFeedOk,
} from './support/mocks';
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

test('cria a comunidade só pelo teclado, com foco visível em cada controle (KAN-37)', async ({ page }) => {
  const recebidas = await mockCriarComunidade(page, { id: 42 });
  await mockComunidadeComFeed(page, { id: 42, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
  await page.goto('/comunidades/nova');

  const nome = page.getByLabel('Nome');
  const descricao = page.getByLabel('Descrição');
  const criar = page.getByRole('button', { name: 'Criar comunidade' });
  await nome.focus();

  for (const controle of [nome, descricao, criar]) {
    await expect(controle).toBeFocused();
    const outline = await controle.evaluate((el) => {
      const s = getComputedStyle(el);
      return { estilo: s.outlineStyle, largura: s.outlineWidth };
    });
    expect(outline.estilo !== 'none' && outline.largura !== '0px').toBe(true);
    if (controle === nome) await page.keyboard.type('Clube de Xadrez');
    if (controle === descricao) await page.keyboard.type('Partidas às quintas');
    if (controle !== criar) await page.keyboard.press('Tab');
  }

  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/comunidades\/42$/);
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

test('clicar em outra comunidade no menu (sem recarregar a página) troca a tela (KAN-89)', async ({
  page,
}) => {
  await page.route(
    (url) => url.port === '8080' && url.pathname === '/comunidades/minhas',
    (route) =>
      route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 14, nome: 'Engenharia de Software', descricao: null, tipo: 'CURSO', souMembro: true, criadoEm: '2026-01-01T00:00:00Z' },
          { id: 27, nome: 'Clube de Xadrez', descricao: null, tipo: 'ABERTA', souMembro: true, criadoEm: '2026-01-02T00:00:00Z' },
        ]),
      }),
  );
  await mockComunidadeComFeed(page, { id: 14, nome: 'Engenharia de Software', tipo: 'CURSO', souMembro: true });
  await mockComunidadeComFeed(page, { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
  await page.goto('/comunidades/14');
  await expect(page.getByRole('heading', { name: 'Engenharia de Software' })).toBeVisible();

  // Link do RouterLink, não page.goto() - só assim reproduz o bug: o Angular
  // reaproveita a mesma instância de ComunidadeDetalhe entre os dois :id.
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Clube de Xadrez' }).click();

  await expect(page).toHaveURL(/\/comunidades\/27$/);
  await expect(page.getByRole('heading', { name: 'Clube de Xadrez' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Engenharia de Software' })).toHaveCount(0);
});

test('voltar e avançar do navegador entre duas comunidades também atualiza a tela (KAN-89)', async ({
  page,
}) => {
  await page.route(
    (url) => url.port === '8080' && url.pathname === '/comunidades/minhas',
    (route) =>
      route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 14, nome: 'Engenharia de Software', descricao: null, tipo: 'CURSO', souMembro: true, criadoEm: '2026-01-01T00:00:00Z' },
          { id: 27, nome: 'Clube de Xadrez', descricao: null, tipo: 'ABERTA', souMembro: true, criadoEm: '2026-01-02T00:00:00Z' },
        ]),
      }),
  );
  await mockComunidadeComFeed(page, { id: 14, nome: 'Engenharia de Software', tipo: 'CURSO', souMembro: true });
  await mockComunidadeComFeed(page, { id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
  await page.goto('/comunidades/14');
  await expect(page.getByRole('heading', { name: 'Engenharia de Software' })).toBeVisible();

  // Navegação dentro do SPA (RouterLink, sem reload) - só assim goBack/goForward
  // disparam popstate no mesmo app Angular, igual ao uso real do navegador.
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  await nav.getByRole('link', { name: 'Clube de Xadrez' }).click();
  await expect(page).toHaveURL(/\/comunidades\/27$/);
  await expect(page.getByRole('heading', { name: 'Clube de Xadrez' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/comunidades\/14$/);
  await expect(page.getByRole('heading', { name: 'Engenharia de Software' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Engenharia de Software' })).toHaveAttribute('aria-current', 'page');

  await page.goForward();
  await expect(page).toHaveURL(/\/comunidades\/27$/);
  await expect(page.getByRole('heading', { name: 'Clube de Xadrez' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Clube de Xadrez' })).toHaveAttribute('aria-current', 'page');
});

/** Administração da comunidade (Story 2.6, KAN-26). */
test.describe('administração da comunidade', () => {
  const MEMBROS: MembroMock[] = [
    { usuarioId: 1, nome: 'Usuário Teste', curso: null, papel: 'ADMINISTRADOR', membroDesde: '2026-08-01T00:00:00Z' },
    { usuarioId: 2, nome: 'Bruno Membro', curso: 'Administração', papel: 'MEMBRO', membroDesde: '2026-08-02T00:00:00Z' },
  ];

  async function abrirComoAdmin(page: import('@playwright/test').Page) {
    await mockComunidadeComFeed(page, { id: 42, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
    const chamadas = await mockAdministrarComunidade(page, {
      id: 42,
      nome: 'Clube de Xadrez',
      descricao: 'Partidas às quintas',
      membros: MEMBROS,
    });
    await page.goto('/comunidades/42');
    await expect(page.getByRole('heading', { name: 'Administração' })).toBeVisible();
    return chamadas;
  }

  test('edita só a descrição e mantém o nome', async ({ page }) => {
    const chamadas = await abrirComoAdmin(page);

    await page.getByLabel('Descrição').fill('Partidas às sextas');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page.getByText('Comunidade atualizada')).toBeVisible();
    expect(chamadas).toEqual([
      { metodo: 'PATCH', caminho: '/comunidades/42', corpo: { nome: 'Clube de Xadrez', descricao: 'Partidas às sextas' } },
    ]);
    await expect(page.getByRole('heading', { name: 'Clube de Xadrez' })).toBeVisible();
  });

  test('remove membro só depois de confirmar', async ({ page }) => {
    const chamadas = await abrirComoAdmin(page);
    const lista = page.getByRole('list').filter({ hasText: 'Bruno Membro' });

    await page.getByRole('button', { name: 'Remover Bruno Membro' }).click();
    await expect(page.getByRole('button', { name: 'Confirmar', exact: true })).toBeFocused();
    expect(chamadas).toEqual([]);

    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();

    await expect(lista).toHaveCount(0);
    expect(chamadas.map((c) => `${c.metodo} ${c.caminho}`)).toEqual(['DELETE /comunidades/42/membros/2']);
  });

  test('exclui a comunidade depois de confirmar e volta para a lista', async ({ page }) => {
    const chamadas = await abrirComoAdmin(page);

    await page.getByRole('button', { name: 'Excluir comunidade' }).click();
    await page.getByRole('button', { name: 'Confirmar exclusão' }).click();

    await expect(page).toHaveURL(/\/comunidades$/);
    await expect(page.getByText('Comunidade Clube de Xadrez excluída')).toBeVisible();
    expect(chamadas.map((c) => `${c.metodo} ${c.caminho}`)).toEqual(['DELETE /comunidades/42']);
  });

  test('membro comum não vê a administração', async ({ page }) => {
    await mockComunidadeComFeed(page, { id: 42, nome: 'Clube de Xadrez', tipo: 'ABERTA', souMembro: true });
    await page.goto('/comunidades/42');

    await expect(page.getByRole('heading', { name: 'Clube de Xadrez' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Administração' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
  });

  test('comunidade de curso não tem botão Sair (KAN-73)', async ({ page }) => {
    await mockComunidadeComFeed(page, { id: 43, nome: 'Engenharia de Software', tipo: 'CURSO', souMembro: true });
    await page.goto('/comunidades/43');

    await expect(page.getByRole('heading', { name: 'Engenharia de Software' })).toBeVisible();
    await expect(page.getByText('Comunidade de curso · associação automática')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0);
  });
});
