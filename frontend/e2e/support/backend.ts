import { readFileSync } from 'node:fs';
import type { APIRequestContext } from '@playwright/test';

/**
 * Apoio dos e2e com Quarkus real (`E2E_BACKEND=1`, tag `@backend`). O link de confirmação
 * é lido do log do `quarkus:dev`: com `EMAIL_TRANSPORTE=smtp` e a mailbox mock (padrão em
 * dev), o e-mail inteiro sai no log. O caminho do log vem de `E2E_QUARKUS_LOG`.
 */
export const API = 'http://localhost:8080';
export const SENHA = 'Senha123!';
export const CURSO_ENG_SOFTWARE = { id: 14, nome: 'Engenharia de Software' };

export function emailUnico(prefixo: string): string {
  return `${prefixo}.${Date.now()}.${Math.floor(Math.random() * 1000)}@catolicasc.edu.br`;
}

/** Espera o e-mail de `email` aparecer no log e devolve o link de confirmação dele. */
export async function linkDeConfirmacao(email: string, timeoutMs = 15_000): Promise<string> {
  const caminho = process.env['E2E_QUARKUS_LOG'];
  if (!caminho) {
    throw new Error('defina E2E_QUARKUS_LOG com o caminho do log do quarkus:dev');
  }
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    const log = readFileSync(caminho, 'utf8');
    const inicio = log.lastIndexOf(`to [${email}]`);
    const link = inicio >= 0 ? /https?:\/\/\S+\/confirmar-email\?token=[\w-]+/.exec(log.slice(inicio)) : null;
    if (link) {
      return link[0];
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`e-mail de confirmação para ${email} não apareceu em ${caminho}`);
}

/** Cadastra pela API e confirma o e-mail com o token do log; devolve o e-mail criado. */
export async function cadastrarConfirmado(request: APIRequestContext, prefixo: string): Promise<string> {
  const email = emailUnico(prefixo);
  const cadastro = await request.post(`${API}/auth/registro`, {
    data: { nome: 'Aluno E2E', email, senha: SENHA, cursoId: CURSO_ENG_SOFTWARE.id, dataNascimento: '2000-01-01' },
  });
  if (cadastro.status() !== 201) {
    throw new Error(`cadastro de ${email} respondeu ${cadastro.status()}: ${await cadastro.text()}`);
  }
  const token = new URL(await linkDeConfirmacao(email)).searchParams.get('token');
  const confirmacao = await request.post(`${API}/auth/confirmacao-email/${token}`);
  if (!confirmacao.ok()) {
    throw new Error(`confirmação de ${email} respondeu ${confirmacao.status()}`);
  }
  return email;
}

export async function tokenDe(request: APIRequestContext, email: string): Promise<string> {
  const resposta = await request.post(`${API}/auth/login`, { data: { email, senha: SENHA } });
  return ((await resposta.json()) as { token: string }).token;
}
