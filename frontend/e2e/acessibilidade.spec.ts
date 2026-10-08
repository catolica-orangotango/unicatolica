import { expect, test, type Page } from '@playwright/test';
import { esperarSemViolacoes } from './support/acessibilidade';
import {
  mockComunidadeComFeed,
  mockConfirmacaoOk,
  mockCursosOk,
  mockFeedOk,
  mockMeuPerfil,
  mockModeracao,
  mockPerfilDeUsuario,
} from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * T6 (KAN-71): axe em cada tela e nos painéis do shell, nos estados que o usuário vê
 * (vazio, com erro, com conteúdo). Backend mockado, como nas outras suítes.
 */

test.describe('Telas públicas', () => {
  test('login, vazio e com erro de validação', async ({ page }) => {
    await page.goto('/login');
    await esperarSemViolacoes(page);

    await page.getByRole('button', { name: 'Entrar' }).click();
    await esperarSemViolacoes(page);
  });

  test('cadastro, vazio e com erro de validação', async ({ page }) => {
    await mockCursosOk(page);
    await page.goto('/cadastro');
    await esperarSemViolacoes(page);

    await page.getByRole('button', { name: 'Cadastrar' }).click();
    await esperarSemViolacoes(page);
  });

  test('confirmar e-mail, link inválido e confirmado', async ({ page }) => {
    await page.goto('/confirmar-email');
    await expect(page.getByRole('heading', { name: 'Não foi possível confirmar' })).toBeVisible();
    await esperarSemViolacoes(page);

    await mockConfirmacaoOk(page);
    await page.goto('/confirmar-email?token=token-valido');
    await expect(page.getByRole('heading', { name: 'E-mail confirmado!' })).toBeVisible();
    await esperarSemViolacoes(page);
  });
});

test.describe('Telas do aluno', () => {
  test.beforeEach(async ({ page }) => {
    await mockFeedOk(page);
    await mockCursosOk(page);
    await plantarToken(page, ['ALUNO']);
  });

  test('início com o menu da conta aberto', async ({ page }) => {
    await page.goto('/feed');
    await esperarSemViolacoes(page);

    await page.getByRole('button', { name: 'Menu da conta' }).click();
    await expect(page.getByRole('menu', { name: 'Conta' })).toBeVisible();
    await esperarSemViolacoes(page);
  });

  test('painel de notificações vazio e com uma não lida', async ({ page }) => {
    await page.goto('/feed');
    await page.getByRole('button', { name: /Notificações/ }).click();
    await expect(page.getByText('Sem notificações por enquanto.')).toBeVisible();
    await esperarSemViolacoes(page);

    await mockNotificacoes(page);
    await page.reload();
    await page.getByRole('button', { name: /Notificações/ }).click();
    await expect(page.getByRole('menuitem', { name: /Complete seu perfil/ })).toBeVisible();
    await esperarSemViolacoes(page);
  });

  test('lista de comunidades', async ({ page }) => {
    await page.goto('/comunidades');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await esperarSemViolacoes(page);
  });

  test('detalhe da comunidade com feed', async ({ page }) => {
    await mockComunidadeComFeed(page, {
      id: 27,
      nome: 'Xadrez',
      tipo: 'ABERTA',
      souMembro: true,
      publicacoes: [
        {
          id: 1,
          comunidadeId: 27,
          autor: { id: 2, nome: 'Maria Souza', curso: 'Direito' },
          conteudo: 'Alguém para uma partida na sexta?',
          criadoEm: new Date(Date.now() - 3_600_000).toISOString(),
        },
      ],
    });
    await page.goto('/comunidades/27');
    await expect(page.getByText('Alguém para uma partida na sexta?')).toBeVisible();
    await esperarSemViolacoes(page);
  });

  test('meu perfil, editando e salvo', async ({ page }) => {
    await mockMeuPerfil(page, { usuarioId: 1, nome: 'Usuário Teste', curso: null, periodo: null, interesses: [] });
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Complete seu perfil' })).toBeVisible();
    await esperarSemViolacoes(page);

    await page.getByLabel('Curso').selectOption({ label: 'Engenharia de Software' });
    await page.getByLabel('Período').selectOption({ label: '3º semestre' });
    await page.getByRole('textbox', { name: 'Interesses' }).fill('Robótica');
    await page.getByRole('button', { name: 'Adicionar' }).click();
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('button', { name: 'Editar perfil' })).toBeVisible();
    await esperarSemViolacoes(page);
  });

  test('perfil de outro usuário', async ({ page }) => {
    await mockPerfilDeUsuario(page, {
      usuarioId: 2,
      nome: 'Maria Souza',
      curso: 'Direito',
      periodo: 3,
      interesses: ['Debate'],
    });
    await page.goto('/usuarios/2');
    await expect(page.getByRole('heading', { name: 'Maria Souza' })).toBeVisible();
    await esperarSemViolacoes(page);
  });
});

test('moderador: fila e análise da denúncia', async ({ page }) => {
  await mockFeedOk(page);
  await plantarToken(page, ['MODERADOR']);
  await mockModeracao(page, [
    {
      id: 1,
      conteudo: {
        tipo: 'PUBLICACAO',
        id: 9,
        texto: 'Alguém viu o jogo ontem?',
        autor: { id: 50, nome: 'Bruno Kramer', curso: 'Engenharia de Software' },
        comunidadeId: 27,
        criadoEm: new Date(Date.now() - 7_200_000).toISOString(),
        situacao: 'VISIVEL',
      },
      motivo: 'Fora do tema',
      situacao: 'PENDENTE',
      criadoEm: new Date(Date.now() - 3_600_000).toISOString(),
      resolvidaEm: null,
    },
  ]);
  await page.goto('/moderacao/denuncias');
  await expect(page.locator('app-analise-denuncia')).toBeVisible();
  await esperarSemViolacoes(page);
});

/** `GET /notificacoes/me` com o aviso de onboarding não lido (Story 4.3). */
async function mockNotificacoes(page: Page): Promise<void> {
  const pagina = {
    content: [
      {
        id: 1,
        tipo: 'ONBOARDING_PERFIL',
        texto: 'Complete seu perfil e apareça mais nas buscas - adicione seus interesses.',
        link: '/perfil',
        lida: false,
        criadoEm: new Date().toISOString(),
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  };
  await page.route(
    (url) => url.port === '8080' && url.pathname === '/notificacoes/me',
    (route) =>
      route.fulfill({
        status: route.request().method() === 'OPTIONS' ? 204 : 200,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'content-type,authorization',
          'content-type': 'application/json',
        },
        body: JSON.stringify(pagina),
      }),
  );
}
