import { expect, test } from '@playwright/test';
import { mockAdminUsuarios, mockAuditoria, mockAvisosAdmin, mockCursosAdmin, mockFeedOk } from './support/mocks';
import { plantarToken, semToken } from './support/seed';

/**
 * Área /admin: só o perfil ADMINISTRADOR entra. Sem backend, com JWT plantado no
 * localStorage; `/feed` é mockado porque os redirecionamentos caem nele.
 */

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
});

function nav(page: import('@playwright/test').Page) {
  return page.getByRole('navigation', { name: 'Navegação principal' });
}

test('administrador abre "Administração" pelo menu e cai na aba Cursos', async ({ page }) => {
  await mockCursosAdmin(page, []);
  await plantarToken(page, ['ADMINISTRADOR']);
  await page.goto('/feed');

  await nav(page).getByRole('link', { name: 'Administração' }).click();

  await expect(page).toHaveURL(/\/admin\/cursos$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Cursos' })).toBeVisible();
  const abas = page.getByRole('navigation', { name: 'Áreas de administração' });
  await expect(abas.getByRole('link')).toHaveText(['Cursos', 'Usuários', 'Logs de auditoria']);
  await expect(abas.getByRole('link', { name: 'Cursos' })).toHaveAttribute('aria-current', 'page');
  await expect(nav(page).getByRole('link', { name: 'Administração' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('as abas trocam entre Cursos, Usuários e Logs de auditoria', async ({ page }) => {
  await mockCursosAdmin(page, []);
  await mockAdminUsuarios(page, []);
  await mockAuditoria(page, []);
  await plantarToken(page, ['ADMINISTRADOR']);
  await page.goto('/admin');
  const abas = page.getByRole('navigation', { name: 'Áreas de administração' });

  await abas.getByRole('link', { name: 'Usuários' }).click();
  await expect(page).toHaveURL(/\/admin\/usuarios$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
  await expect(abas.getByRole('link', { name: 'Usuários' })).toHaveAttribute('aria-current', 'page');

  await abas.getByRole('link', { name: 'Logs de auditoria' }).click();
  await expect(page).toHaveURL(/\/admin\/auditoria$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Logs de auditoria' })).toBeVisible();

  await abas.getByRole('link', { name: 'Cursos' }).click();
  await expect(page).toHaveURL(/\/admin\/cursos$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Cursos' })).toBeVisible();
});

test('aluno que digita /admin volta para o Início', async ({ page }) => {
  await plantarToken(page, ['ALUNO']);
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole('heading', { name: 'Administração' })).toHaveCount(0);
});

test('moderador que digita /admin volta para o Início e continua vendo "Denúncias"', async ({
  page,
}) => {
  await plantarToken(page, ['MODERADOR']);
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/feed$/);
  await expect(nav(page).getByRole('link', { name: 'Administração' })).toHaveCount(0);
  await expect(nav(page).getByText('Denúncias', { exact: true })).toBeVisible();
});

test('sem token, /admin vai para o login', async ({ page }) => {
  await semToken(page);
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/login$/);
});

test.describe('Cursos (KAN-44)', () => {
  const CURSOS = [
    { id: 1, nome: 'Administração', ativo: true },
    { id: 2, nome: 'Direito', ativo: true },
  ];

  test('/admin abre direto na aba Cursos', async ({ page }) => {
    await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/cursos$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cursos' })).toBeVisible();
    await expect(page.locator('.cursos__nome', { hasText: 'Direito' })).toBeVisible();
  });

  test('cadastra um curso e ele aparece no cadastro de aluno', async ({ page }) => {
    const chamadas = await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin/cursos');

    await page.getByLabel('Nome do curso').fill('Curso Teste');
    await page.getByRole('button', { name: 'Cadastrar curso' }).click();

    await expect(page.getByText('Curso Curso Teste cadastrado')).toBeVisible();
    await expect(page.getByText('Curso Teste', { exact: true })).toBeVisible();
    expect(chamadas).toEqual([{ metodo: 'POST', caminho: '/cursos', corpo: { nome: 'Curso Teste' } }]);

    await page.goto('/cadastro');
    await expect(page.getByLabel('Curso').locator('option', { hasText: 'Curso Teste' })).toHaveCount(1);
  });

  test('nome já usado mostra o erro da API', async ({ page }) => {
    await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin/cursos');

    await page.getByLabel('Nome do curso').fill('direito');
    await page.getByRole('button', { name: 'Cadastrar curso' }).click();

    await expect(page.getByRole('alert')).toContainText('Já existe um curso com esse nome.');
  });

  test('renomeia e depois desativa: o curso some do cadastro de aluno', async ({ page }) => {
    const chamadas = await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin/cursos');

    await page.getByRole('button', { name: 'Renomear Direito' }).click();
    await page.getByLabel('Novo nome de Direito').fill('Direito Noturno');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Direito Noturno', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Desativar Direito Noturno' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText('Inativo')).toBeVisible();

    expect(chamadas.map((c) => [c.metodo, c.caminho, c.corpo])).toEqual([
      ['PUT', '/cursos/2', { nome: 'Direito Noturno', ativo: true }],
      ['PUT', '/cursos/2', { nome: 'Direito Noturno', ativo: false }],
    ]);

    await page.goto('/cadastro');
    await expect(page.getByLabel('Curso').locator('option', { hasText: 'Direito Noturno' })).toHaveCount(0);
  });

  test('aluno que digita /admin/cursos volta para o Início', async ({ page }) => {
    await plantarToken(page, ['ALUNO']);
    await page.goto('/admin/cursos');

    await expect(page).toHaveURL(/\/feed$/);
  });
});

test.describe('Publicar aviso (Story 13.1)', () => {
  const CURSOS = [
    { id: 1, nome: 'Administração', ativo: true },
    { id: 2, nome: 'Direito', ativo: true },
  ];

  test('a Administração mostra "Publicar aviso" ao lado dos cursos', async ({ page }) => {
    await mockCursosAdmin(page, CURSOS);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Publicar aviso' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Enviados recentemente' })).toBeVisible();
    await expect(page.getByText('Nenhum aviso enviado ainda.')).toBeVisible();
    await expect(page.getByLabel('Para quem').locator('option')).toHaveText(['Todos os cursos', 'Administração', 'Direito']);
  });

  test('publica um aviso para um curso e ele entra em "Enviados recentemente"', async ({ page }) => {
    await mockCursosAdmin(page, CURSOS);
    const recebidos = await mockAvisosAdmin(page);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin/cursos');

    await page.getByLabel('Título').fill('Palestra de carreira');
    await page.getByLabel('Mensagem').fill('Auditório 2, quarta às 19h.');
    await page.getByLabel('Para quem').selectOption({ label: 'Direito' });
    await page.getByRole('button', { name: 'Publicar aviso' }).click();

    await expect(page.getByText('Aviso publicado')).toBeVisible();
    await expect(page.locator('.avisos__item')).toContainText('Palestra de carreira');
    await expect(page.locator('.avisos__item')).toContainText('Direito');
    expect(recebidos).toEqual([
      { titulo: 'Palestra de carreira', mensagem: 'Auditório 2, quarta às 19h.', escopo: 'CURSO', cursoId: 2, dataDestaque: null },
    ]);
    await expect(page.getByLabel('Título')).toHaveValue('');
  });

  test('enviar vazio mostra os erros dos campos e não chama a API', async ({ page }) => {
    await mockCursosAdmin(page, CURSOS);
    const recebidos = await mockAvisosAdmin(page);
    await plantarToken(page, ['ADMINISTRADOR']);
    await page.goto('/admin/cursos');

    await page.getByRole('button', { name: 'Publicar aviso' }).click();

    await expect(page.getByText('Informe o título do aviso.')).toBeVisible();
    await expect(page.getByText('Escreva a mensagem do aviso.')).toBeVisible();
    expect(recebidos).toEqual([]);
  });
});
