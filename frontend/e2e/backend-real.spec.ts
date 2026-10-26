import { expect, test, type Page } from '@playwright/test';
import {
  API,
  CURSO_ENG_SOFTWARE,
  SENHA,
  cadastrarConfirmado,
  emailUnico,
  linkDeConfirmacao,
  tokenDe,
} from './support/backend';

/**
 * T3 (KAN-68): fluxos de ponta a ponta contra o Quarkus real, sem `page.route()`. Rodam no
 * job "E2E backend" do CI; local, com `E2E_BACKEND=1` e `E2E_QUARKUS_LOG` (ver AGENTS.md).
 */
test.describe('backend real', { tag: '@backend' }, () => {
  test.skip(!process.env['E2E_BACKEND'], 'defina E2E_BACKEND=1 com o quarkus:dev no ar');

  test('cadastro → confirmação pelo link do e-mail → login', async ({ page }) => {
    const email = emailUnico('cadastro');

    await page.goto('/cadastro');
    await page.getByLabel('Nome completo').fill('Aluno Cadastro E2E');
    await page.getByLabel('E-mail institucional').fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByLabel('Confirmar senha').fill(SENHA);
    await page.getByLabel('Curso').selectOption({ label: CURSO_ENG_SOFTWARE.nome });
    await page.getByLabel('Data de nascimento').fill('2000-01-01');
    await page.getByRole('button', { name: 'Cadastrar' }).click();
    await expect(page.getByRole('heading', { name: 'Verifique seu e-mail' })).toBeVisible();

    await page.goto(await linkDeConfirmacao(email));
    await expect(page.getByRole('heading', { name: 'E-mail confirmado!' })).toBeVisible();

    await entrar(page, email);
    // Auto-join (RF24.1): a comunidade do curso já aparece em "Suas comunidades".
    await expect(page.getByRole('list', { name: 'Suas comunidades' })).toContainText(CURSO_ENG_SOFTWARE.nome);
  });

  test('entra e sai de uma comunidade aberta', async ({ page, request }) => {
    const criador = await tokenDe(request, 'aluno.teste@catolicasc.edu.br');
    const nome = `E2E aberta ${Date.now()}`;
    const criada = await request.post(`${API}/comunidades`, {
      headers: { Authorization: `Bearer ${criador}` },
      data: { nome },
    });
    expect(criada.status()).toBe(201);
    const { id } = (await criada.json()) as { id: number };

    await entrar(page, await cadastrarConfirmado(request, 'membro'));
    await page.goto(`/comunidades/${id}`);

    await page.getByRole('button', { name: 'Participar' }).click();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Suas comunidades' })).toContainText(nome);

    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('button', { name: 'Participar' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Suas comunidades' })).not.toContainText(nome);
  });

  test('administrador cadastra, renomeia e desativa um curso pela tela (KAN-88)', async ({ page }) => {
    const nome = `E2E curso ${Date.now()}`;
    const renomeado = `${nome} B`;

    await entrar(page, 'admin.teste@catolicasc.edu.br');
    await page.goto('/admin/cursos');
    await expect(page.getByRole('heading', { level: 1, name: 'Cursos' })).toBeVisible();
    await expect(page.getByText('Não foi possível carregar os cursos agora.')).toHaveCount(0);

    await page.getByRole('textbox', { name: 'Nome do curso' }).fill(nome);
    await page.getByRole('button', { name: 'Cadastrar curso' }).click();
    await expect(page.getByText(`Curso ${nome} cadastrado`)).toBeVisible();

    await page.getByRole('button', { name: `Renomear ${nome}` }).click();
    await page.getByRole('textbox', { name: `Novo nome de ${nome}` }).fill(renomeado);
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(`Curso renomeado para ${renomeado}`)).toBeVisible();

    await page.getByRole('button', { name: `Desativar ${renomeado}` }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(page.getByText(`Curso ${renomeado} desativado`)).toBeVisible();
  });
});

async function entrar(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/feed$/);
}
