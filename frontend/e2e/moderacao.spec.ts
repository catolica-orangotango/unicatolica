import { expect, test } from '@playwright/test';
import { DenunciaMock, mockComunidadeComFeed, mockDenunciar, mockFeedOk, mockModeracao } from './support/mocks';
import { plantarToken } from './support/seed';

/**
 * Moderação (Stories 12.1, 12.4 e 12.5): o aluno denuncia uma postagem no feed; o
 * moderador abre a fila pelo menu, analisa sem ver quem denunciou (RF77.1), oculta e
 * restaura. Backend mockado via `page.route()` no formato do `openapi.yaml`.
 */

const ha = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString();

function denuncia(id: number, publicacaoId: number, motivo: string, texto: string): DenunciaMock {
  return {
    id,
    conteudo: {
      tipo: 'PUBLICACAO',
      id: publicacaoId,
      texto,
      autor: { id: 50, nome: 'Bruno Kramer', curso: 'Engenharia de Software' },
      comunidadeId: 27,
      criadoEm: ha(60),
      situacao: 'VISIVEL',
    },
    motivo,
    situacao: 'PENDENTE',
    criadoEm: ha(25),
    resolvidaEm: null,
  };
}

test.beforeEach(async ({ page }) => {
  await mockFeedOk(page);
});

test('aluno denuncia uma postagem pelo próprio card', async ({ page }) => {
  await plantarToken(page, ['ALUNO']);
  await mockComunidadeComFeed(page, {
    id: 27,
    nome: 'Clube de Xadrez',
    tipo: 'ABERTA',
    souMembro: true,
    publicacoes: [
      {
        id: 7,
        comunidadeId: 27,
        autor: { id: 50, nome: 'Bruno Kramer', curso: null },
        conteudo: 'Clique neste link para ganhar créditos',
        criadoEm: ha(5),
      },
    ],
  });
  const recebidas = await mockDenunciar(page);
  await page.goto('/comunidades/27');

  const post = page.locator('.feed__post').first();
  await post.getByRole('button', { name: 'Denunciar' }).click();
  await post.getByLabel('Por que esta postagem é imprópria?').fill('Link de phishing');
  await post.getByRole('button', { name: 'Enviar denúncia' }).click();

  await expect(page.getByText('Denúncia enviada. A moderação vai analisar.')).toBeVisible();
  await expect(post.getByText('Denunciada')).toBeVisible();
  await expect(post.getByRole('button', { name: 'Denunciar' })).toHaveCount(0);
  expect(recebidas).toEqual([{ tipoConteudo: 'PUBLICACAO', conteudoId: 7, motivo: 'Link de phishing' }]);
});

test('moderador oculta pela fila, a denúncia sai das pendentes e é restaurada', async ({ page }) => {
  await plantarToken(page, ['MODERADOR']);
  await mockModeracao(page, [
    denuncia(2201, 7, 'Discurso ofensivo', 'Só isso mesmo que dá pra esperar de você.'),
    denuncia(2202, 8, 'Fora do tema', 'Alguém viu o jogo ontem?'),
  ]);
  await page.goto('/feed');

  const menu = page.getByRole('navigation', { name: 'Navegação principal' });
  const link = menu.getByRole('link', { name: /Denúncias/ });
  await expect(link).toContainText('2');
  await link.click();
  await expect(page).toHaveURL(/\/moderacao\/denuncias$/);

  await expect(page.locator('.fila__item')).toHaveCount(2);
  const painel = page.locator('app-analise-denuncia');
  await expect(painel).toContainText('Denúncia #2201');
  await expect(painel).toContainText('A identidade de quem denunciou não é compartilhada com você.');
  await expect(painel).toContainText('Bruno Kramer');
  await expect(painel).toContainText('Discurso ofensivo');

  const ocultar = painel.getByRole('button', { name: 'Ocultar postagem' });
  await expect(ocultar).toBeDisabled();
  await painel.getByLabel('Motivo da decisão').fill('Ataque pessoal a um colega.');
  await ocultar.click();

  await expect(page.getByText('Postagem ocultada')).toBeVisible();
  await expect(page.locator('.fila__item')).toHaveCount(1);
  await expect(painel).toContainText('Denúncia #2202');
  await expect(link).toContainText('1');

  await page.getByRole('button', { name: 'Resolvidas' }).click();
  await expect(painel).toContainText('Denúncia #2201');
  await expect(painel.getByText('Oculta', { exact: true })).toBeVisible();
  await painel.getByRole('button', { name: 'Restaurar postagem' }).click();

  await expect(page.getByText('Postagem restaurada')).toBeVisible();
  await expect(painel).toContainText('a postagem está visível no feed');
});

test('moderador descarta uma denúncia improcedente', async ({ page }) => {
  await plantarToken(page, ['MODERADOR']);
  await mockModeracao(page, [denuncia(2202, 8, 'Fora do tema', 'Alguém viu o jogo ontem?')]);
  await page.goto('/moderacao/denuncias');

  await page.locator('app-analise-denuncia').getByRole('button', { name: 'Descartar denúncia' }).click();

  await expect(page.getByText('Denúncia descartada')).toBeVisible();
  await expect(page.getByText('Nenhuma denúncia pendente. Tudo em ordem por aqui.')).toBeVisible();
});

test('aluno que abre a fila direto volta para o Início', async ({ page }) => {
  await plantarToken(page, ['ALUNO']);
  await page.goto('/moderacao/denuncias');

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole('link', { name: /Denúncias/ })).toHaveCount(0);
});
