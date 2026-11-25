import { expect, test, type Page } from '@playwright/test';
import { esperarSemViolacoes } from './support/acessibilidade';
import { VIEWPORT_CELULAR, VIEWPORT_DESKTOP, gatilhoDaConta, menuDaConta } from './support/casca';
import {
  mockAdminUsuarios,
  mockAuditoria,
  mockComunidadeComFeed,
  mockConfirmacaoOk,
  mockCursosOk,
  mockCriarEnquete,
  mockCursosAdmin,
  mockFeedOk,
  mockMeuPerfil,
  FOTO_PIXEL,
  mockMinhasComunidades,
  mockModeracao,
  mockPerfilDeUsuario,
} from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * T6 (KAN-71): axe em cada tela e nos painéis do shell, nos estados que o usuário vê
 * (vazio, com erro, com conteúdo), e o título da aba de cada tela (WCAG 2.4.2, que o axe
 * não confere). Backend mockado, como nas outras suítes.
 *
 * Redesign KAN-91: tudo roda duas vezes, no desktop (1440px, menu com cartão da conta)
 * e no celular (360px, barra superior, barra de abas e gaveta), porque a casca muda de
 * markup entre os dois.
 */

for (const viewport of [VIEWPORT_DESKTOP, VIEWPORT_CELULAR]) {
  test.describe(`em ${viewport.width}px`, () => {
    test.use({ viewport });

    test.describe('Telas públicas', () => {
      test('login, vazio e com erro de validação', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle('Entrar — UniCatólica');
        await esperarSemViolacoes(page);

        await page.getByRole('button', { name: 'Entrar' }).click();
        await esperarSemViolacoes(page);
      });

      test('cadastro, vazio e com erro de validação', async ({ page }) => {
        await mockCursosOk(page);
        await page.goto('/cadastro');
        await expect(page).toHaveTitle('Criar conta — UniCatólica');
        await esperarSemViolacoes(page);

        await page.getByRole('button', { name: 'Cadastrar' }).click();
        await esperarSemViolacoes(page);
      });

      test('confirmar e-mail, link inválido e confirmado', async ({ page }) => {
        await page.goto('/confirmar-email');
        await expect(
          page.getByRole('heading', { name: 'Não foi possível confirmar' }),
        ).toBeVisible();
        await expect(page).toHaveTitle('Confirmar e-mail — UniCatólica');
        await esperarSemViolacoes(page);

        await mockConfirmacaoOk(page);
        await page.goto('/confirmar-email?token=token-valido');
        await expect(page.getByRole('heading', { name: 'E-mail confirmado!' })).toBeVisible();
        await esperarSemViolacoes(page);
      });

      test('política de privacidade e termos de uso (KAN-130)', async ({ page }) => {
        await page.goto('/privacidade');
        await expect(page.getByRole('heading', { level: 1, name: 'Política de Privacidade' })).toBeVisible();
        await expect(page).toHaveTitle('Política de Privacidade — UniCatólica');
        await esperarSemViolacoes(page);

        await page.goto('/termos');
        await expect(page.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeVisible();
        await expect(page).toHaveTitle('Termos de Uso — UniCatólica');
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
        await expect(page).toHaveTitle('Início — UniCatólica');
        await esperarSemViolacoes(page);

        await gatilhoDaConta(page).click();
        await expect(menuDaConta(page)).toBeVisible();
        await esperarSemViolacoes(page);
      });

      test('início com as publicações da comunidade do curso (KAN-93)', async ({ page }) => {
        await mockMinhasComunidades(page, [{ id: 14, nome: 'Engenharia de Software', tipo: 'CURSO' }]);
        await mockComunidadeComFeed(page, {
          id: 14,
          nome: 'Engenharia de Software',
          tipo: 'CURSO',
          souMembro: true,
          publicacoes: [
            {
              id: 1,
              comunidadeId: 14,
              autor: { id: 50, nome: 'Ana Lima', curso: 'Engenharia de Software' },
              conteudo: 'Prova de Cálculo adiada para sexta.',
              criadoEm: new Date(Date.now() - 5 * 60_000).toISOString(),
            },
          ],
        });
        await page.goto('/feed');
        await expect(page.locator('.feed__post')).toHaveCount(1);
        await esperarSemViolacoes(page);
      });

      test('gaveta "Suas comunidades" aberta (só no celular)', async ({ page }) => {
        test.skip(viewport.width > 760, 'a gaveta só existe até 760px');
        await page.route(
          (url) => url.port === '8080' && url.pathname === '/comunidades/minhas',
          (route) =>
            route.fulfill({
              status: 200,
              headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
              body: JSON.stringify([
                {
                  id: 1,
                  nome: 'Engenharia de Software',
                  descricao: null,
                  tipo: 'CURSO',
                  souMembro: true,
                  criadoEm: '2026-01-01T00:00:00Z',
                },
              ]),
            }),
        );
        await page.goto('/feed');
        await page.getByRole('button', { name: 'Suas comunidades' }).click();
        await expect(
          page.getByRole('link', { name: /Engenharia de Software/ }).first(),
        ).toBeVisible();
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
        await expect(page).toHaveTitle('Descobrir comunidades — UniCatólica');
        await esperarSemViolacoes(page);
      });

      test('criar comunidade, vazio e com erro de validação', async ({ page }) => {
        await page.goto('/comunidades/nova');
        await expect(
          page.getByRole('heading', { level: 1, name: 'Criar comunidade' }),
        ).toBeVisible();
        await expect(page).toHaveTitle('Criar comunidade — UniCatólica');
        await esperarSemViolacoes(page);

        await page.getByRole('button', { name: 'Criar comunidade' }).click();
        await expect(page.getByLabel('Nome')).toHaveAttribute('aria-invalid', 'true');
        await esperarSemViolacoes(page);
      });

      test('criar enquete, vazio e com erro de validação', async ({ page }) => {
        await mockMinhasComunidades(page, [{ id: 27, nome: 'Clube de Xadrez', tipo: 'ABERTA' }]);
        await mockCriarEnquete(page);
        await page.goto('/enquetes/nova');
        await expect(page.getByRole('heading', { level: 1, name: 'Criar enquete' })).toBeVisible();
        await expect(page).toHaveTitle('Criar enquete — UniCatólica');
        await esperarSemViolacoes(page);

        await page.getByRole('button', { name: 'Criar enquete' }).click();
        await expect(page.getByLabel('Pergunta')).toHaveAttribute('aria-invalid', 'true');
        await esperarSemViolacoes(page);

        await page.getByLabel('Escolha múltipla').check();
        await esperarSemViolacoes(page);
      });

      test('enquetes na comunidade: membro votando, já votou e não membro', async ({ page }) => {
        const enquete = {
          id: 5,
          comunidadeId: 27,
          autor: { id: 2, nome: 'Maria Souza', curso: 'Direito' },
          pergunta: 'Melhor dia?',
          tipo: 'UNICA' as const,
          limiteSelecao: null,
          opcoes: [{ id: 50, texto: 'Segunda' }, { id: 51, texto: 'Terça' }],
          situacao: 'ATIVA' as const,
          jaVotei: false,
          resultado: null,
          criadaEm: new Date(Date.now() - 3_600_000).toISOString(),
        };
        await mockComunidadeComFeed(page, {
          id: 27,
          nome: 'Xadrez',
          tipo: 'ABERTA',
          souMembro: true,
          enquetes: [enquete, { ...enquete, id: 6, pergunta: 'Quais dias?', tipo: 'MULTIPLA', limiteSelecao: 2, jaVotei: true, resultado: { totalVotantes: 5, votosNecessarios: 5, liberado: true, opcoes: enquete.opcoes.map((o, i) => ({ opcaoId: o.id, votos: i + 1 })) } }],
        });
        await page.goto('/comunidades/27');
        await expect(page.getByRole('radiogroup', { name: 'Melhor dia?' })).toBeVisible();
        await esperarSemViolacoes(page);

        await page.getByRole('button', { name: 'Votar' }).click();
        await expect(page.getByRole('alert')).toHaveText('Escolha uma opção para votar.');
        await esperarSemViolacoes(page);

        // Opção marcada, ao lado da enquete "já votou". O voto em si, com toast, é coberto em enquetes.spec.ts.
        await page.getByLabel('Terça').check();
        await expect(page.getByText('Você já votou nesta enquete.')).toBeVisible();
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
        await expect(page).toHaveTitle('Comunidade — UniCatólica');
        await esperarSemViolacoes(page);
      });

      test('detalhe da comunidade com anexo escolhido e postagens com imagem e PDF', async ({ page }) => {
        const autor = { id: 2, nome: 'Maria Souza', curso: 'Direito' };
        const criadoEm = new Date(Date.now() - 3_600_000).toISOString();
        const pixel =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        await mockComunidadeComFeed(page, {
          id: 27,
          nome: 'Xadrez',
          tipo: 'ABERTA',
          souMembro: true,
          publicacoes: [
            {
              id: 1,
              comunidadeId: 27,
              autor,
              conteudo: 'Tabuleiro novo',
              criadoEm,
              anexo: { id: 1, nome: 'tabuleiro.png', tipo: 'image/png', tamanho: 4, url: pixel },
            },
            {
              id: 2,
              comunidadeId: 27,
              autor,
              conteudo: 'Regulamento do torneio',
              criadoEm,
              anexo: { id: 2, nome: 'regulamento.pdf', tipo: 'application/pdf', tamanho: 4, url: 'http://localhost:8080/arquivos-mock/2' },
            },
          ],
        });
        await page.goto('/comunidades/27');
        await page.locator('input[type="file"]').setInputFiles({
          name: 'edital.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4'),
        });
        await expect(page.getByRole('button', { name: 'Remover anexo' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'regulamento.pdf' })).toBeVisible();
        await esperarSemViolacoes(page);
      });

      test('meu perfil, editando e salvo', async ({ page }) => {
        await mockMeuPerfil(page, {
          usuarioId: 1,
          nome: 'Usuário Teste',
          curso: null,
          periodo: null,
          interesses: [],
        });
        await page.goto('/perfil');
        await expect(page.getByRole('heading', { name: 'Complete seu perfil' })).toBeVisible();
        await expect(page).toHaveTitle('Meu perfil — UniCatólica');
        await esperarSemViolacoes(page);

        await page.getByLabel('Curso').selectOption({ label: 'Engenharia de Software' });
        await page.getByLabel('Período').selectOption({ label: '3º semestre' });
        await page.getByRole('textbox', { name: 'Interesses' }).fill('Robótica');
        await page.getByRole('button', { name: 'Adicionar' }).click();
        await page.getByRole('button', { name: 'Salvar' }).click();
        await expect(page.getByRole('button', { name: 'Editar perfil' })).toBeVisible();
        await esperarSemViolacoes(page);
      });

      test('meu perfil com foto, e depois do erro de formato', async ({ page }) => {
        await mockMeuPerfil(page, {
          usuarioId: 1,
          nome: 'Usuário Teste',
          curso: { id: 14, nome: 'Engenharia de Software' },
          periodo: 3,
          interesses: ['Java'],
          fotoUrl: FOTO_PIXEL,
        });
        await page.goto('/perfil');
        await expect(page.getByRole('button', { name: 'Remover foto' })).toBeVisible();
        await expect(page.locator('app-perfil-cartao uc-avatar img')).toBeVisible();
        await esperarSemViolacoes(page);

        await page.locator('input[type="file"]').setInputFiles({
          name: 'edital.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4'),
        });
        await expect(page.getByRole('alert')).toContainText('PNG ou JPEG');
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
        await expect(page).toHaveTitle('Perfil — UniCatólica');
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
      await expect(page).toHaveTitle('Denúncias — UniCatólica');
      await esperarSemViolacoes(page);
    });

    test('administrador: /admin abre em Cursos com as abas da administração', async ({ page }) => {
      await mockFeedOk(page);
      await mockCursosAdmin(page, [{ id: 1, nome: 'Administração', ativo: true }]);
      await plantarToken(page, ['ADMINISTRADOR']);
      await page.goto('/admin');
      await expect(page.getByRole('heading', { level: 1, name: 'Cursos' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Áreas de administração' })).toBeVisible();
      await expect(page).toHaveTitle('Cursos — UniCatólica');
      await esperarSemViolacoes(page);
    });

    test('administrador: usuários, lista e confirmação de alteração', async ({ page }) => {
      await mockFeedOk(page);
      await mockAdminUsuarios(page, [
        {
          id: 2,
          nomeCompleto: 'Ana Aluna',
          email: 'ana@catolicasc.edu.br',
          curso: 'Administração',
          perfil: 'ALUNO',
          ativo: true,
        },
        {
          id: 3,
          nomeCompleto: 'Beto Bloqueado',
          email: 'beto@catolicasc.edu.br',
          curso: null,
          perfil: 'MODERADOR',
          ativo: false,
        },
      ]);
      await plantarToken(page, ['ADMINISTRADOR']);
      await page.goto('/admin/usuarios');
      await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
      await expect(page).toHaveTitle('Usuários — UniCatólica');
      await esperarSemViolacoes(page);

      await page.getByRole('button', { name: 'Alterar perfil de Ana Aluna' }).click();
      await expect(page.getByRole('button', { name: 'Confirmar alteração' })).toBeFocused();
      await esperarSemViolacoes(page);

      await page.getByRole('button', { name: 'Cancelar' }).click();
      await page.getByRole('button', { name: 'Desativar conta de Ana Aluna' }).click();
      await esperarSemViolacoes(page);
    });

    test('administrador: logs de auditoria, lista e estado vazio', async ({ page }) => {
      await mockFeedOk(page);
      await mockAuditoria(page, [
        {
          id: 1,
          criadoEm: '2026-03-10T02:30:00Z',
          autor: { id: 1, nome: 'Administrador Teste', email: 'admin.teste@catolicasc.edu.br' },
          modulo: 'identidade',
          acao: 'PERFIL_ALTERADO',
          entidadeAfetada: 'Usuario',
          entidadeId: 7,
          detalhes: 'ALUNO -> MODERADOR',
        },
        {
          id: 2,
          criadoEm: '2026-03-11T13:00:00Z',
          autor: null,
          modulo: 'comunidades',
          acao: 'COMUNIDADE_CURSO_RENOMEADA',
          entidadeAfetada: null,
          entidadeId: null,
          detalhes: null,
        },
      ]);
      await plantarToken(page, ['ADMINISTRADOR']);
      await page.goto('/admin/auditoria');
      await expect(page.getByRole('heading', { level: 1, name: 'Logs de auditoria' })).toBeVisible();
      await expect(page).toHaveTitle('Logs de auditoria — UniCatólica');
      await expect(page.locator('tbody tr')).toHaveCount(2);
      await esperarSemViolacoes(page);

      await page.goto('/admin/auditoria?modulo=identidade&acao=COMUNIDADE_CURSO_RENOMEADA');
      await expect(page.getByText('Nenhum log para esses filtros')).toBeVisible();
      await esperarSemViolacoes(page);

      await page.goto('/admin/auditoria?de=2026-03-12&ate=2026-03-10');
      await expect(page.getByText('A data inicial não pode ser depois da data final.')).toBeVisible();
      await esperarSemViolacoes(page);
    });

    test('administrador: tela de cursos', async ({ page }) => {
      await mockFeedOk(page);
      await mockCursosAdmin(page, [
        { id: 1, nome: 'Administração', ativo: true },
        { id: 2, nome: 'Direito', ativo: false },
      ]);
      await plantarToken(page, ['ADMINISTRADOR']);
      await page.goto('/admin/cursos');
      await expect(page.getByRole('heading', { level: 1, name: 'Cursos' })).toBeVisible();
      await expect(page).toHaveTitle('Cursos — UniCatólica');
      await esperarSemViolacoes(page);
    });
  });
}

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
