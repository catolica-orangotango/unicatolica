import type { Page } from '@playwright/test';
import { jwtNaoAssinado } from './jwt';

/**
 * Mocks das rotas `/auth/*` via `page.route()`, para as suítes rodarem sem o
 * backend Quarkus. O frontend chama `http://localhost:8080` cross-origin, então
 * toda resposta mockada carrega cabeçalhos CORS e um `OPTIONS` (preflight que o
 * HttpClient dispara por causa do `Content-Type: application/json`) responde
 * `204`.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization',
} as const;

/** Envelope de erro padrão da API (AD-5): `{ error: { code, message, details } }`. */
function envelopeErro(code: string, message: string): string {
  return JSON.stringify({ error: { code, message, details: null } });
}

type Padrao = string | ((url: URL) => boolean);

async function rota(page: Page, padrao: Padrao, status: number, body: string): Promise<void> {
  await page.route(padrao, (route) => {
    if (route.request().method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: CORS });
    }
    return route.fulfill({
      status,
      headers: { ...CORS, 'content-type': 'application/json' },
      body,
    });
  });
}

/** `POST /auth/login` -> 200 com um JWT não assinado carregando `perfis`. */
export function mockLoginOk(page: Page, perfis: string[] = ['ALUNO']): Promise<void> {
  return rota(page, '**/auth/login', 200, JSON.stringify({ token: jwtNaoAssinado(perfis) }));
}

/** `POST /auth/login` -> 401 (credenciais inválidas). */
export function mockLogin401(page: Page): Promise<void> {
  return rota(
    page,
    '**/auth/login',
    401,
    envelopeErro('CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.'),
  );
}

/** `POST /auth/logout` -> 204 (best-effort; o frontend engole erro de qualquer forma). */
export function mockLogoutOk(page: Page): Promise<void> {
  return rota(page, '**/auth/logout', 204, '');
}

/** `POST /auth/confirmacao-email/{token}` -> 204 (confirmado). */
export function mockConfirmacaoOk(page: Page): Promise<void> {
  return rota(page, '**/auth/confirmacao-email/**', 204, '');
}

/** `POST /auth/confirmacao-email/{token}` -> 422 com mensagem específica. */
export function mockConfirmacaoInvalida(page: Page): Promise<void> {
  return rota(
    page,
    '**/auth/confirmacao-email/**',
    422,
    envelopeErro('TOKEN_INVALIDO', 'Este link de confirmação expirou ou já foi usado.'),
  );
}

/**
 * Mocka os 3 GETs que a Home (`/feed`, Epic 2) dispara ao montar
 * (`usuarios/me`, `comunidades/minhas`, `comunidades` com `tipo=ABERTA`), pra
 * navegar até lá sem depender de backend nem poluir o console com
 * `ERR_CONNECTION_REFUSED`. Conteúdo da Home é fora de escopo desta suíte
 * (Story 14.3/14.5 cobrem só a casca) - os defaults só existem pra a página
 * assentar num estado limpo por trás do chrome (sidebar/topbar) que os testes
 * de shell realmente verificam.
 */
export async function mockFeedOk(page: Page): Promise<void> {
  const usuario = {
    id: 1,
    nome: 'Usuário Teste',
    email: 'usuario.teste@catolicasc.edu.br',
    perfil: 'ALUNO',
    curso: null,
  };
  const paginaVazia = { content: [], page: 0, size: 6, totalElements: 0, totalPages: 0 };

  await rota(page, (url) => url.pathname === '/usuarios/me', 200, JSON.stringify(usuario));
  await rota(page, (url) => url.pathname === '/comunidades/minhas', 200, JSON.stringify([]));
  await rota(page, (url) => url.pathname === '/comunidades', 200, JSON.stringify(paginaVazia));
}

/**
 * Só a API (`:8080`). `/comunidades/{id}` também é rota do Angular (`:4200`): sem
 * isso o mock responderia a própria navegação da página com JSON.
 */
function ehApi(url: URL): boolean {
  return url.port === '8080';
}

/** Postagem no formato de `PublicacaoResponse` do `openapi.yaml`. */
export interface PublicacaoMock {
  id: number;
  comunidadeId: number;
  autor: { id: number; nome: string; curso: string | null };
  conteudo: string;
  criadoEm: string;
}

/**
 * Mocka a "Home da comunidade" `/comunidades/{id}` com o feed de Publicações
 * (Stories 3.1/3.2): `GET /comunidades/{id}` e `GET`/`POST
 * /comunidades/{id}/publicacoes`. O `POST` guarda a postagem na lista em
 * memória (topo), então um `GET` depois já a devolve, como o backend real.
 * Registrar depois de `mockFeedOk` (a última rota registrada tem prioridade).
 */
export async function mockComunidadeComFeed(
  page: Page,
  opcoes: { id: number; nome: string; tipo: 'CURSO' | 'ABERTA'; souMembro: boolean; publicacoes?: PublicacaoMock[] },
): Promise<PublicacaoMock[]> {
  const publicacoes = [...(opcoes.publicacoes ?? [])];
  const comunidade = {
    id: opcoes.id,
    nome: opcoes.nome,
    descricao: null,
    tipo: opcoes.tipo,
    souMembro: opcoes.souMembro,
    criadoEm: '2026-08-01T00:00:00Z',
  };

  await rota(page, (url) => ehApi(url) && url.pathname === `/comunidades/${opcoes.id}`, 200, JSON.stringify(comunidade));
  await page.route(
    (url) => ehApi(url) && url.pathname === `/comunidades/${opcoes.id}/publicacoes`,
    (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      if (request.method() === 'POST') {
        const { conteudo } = request.postDataJSON() as { conteudo: string };
        const nova: PublicacaoMock = {
          id: 1000 + publicacoes.length,
          comunidadeId: opcoes.id,
          autor: { id: 1, nome: 'Usuário Teste', curso: null },
          conteudo: conteudo.trim(),
          criadoEm: new Date().toISOString(),
        };
        publicacoes.unshift(nova);
        return route.fulfill({
          status: 201,
          headers: { ...CORS, 'content-type': 'application/json' },
          body: JSON.stringify(nova),
        });
      }
      const pagina = {
        content: publicacoes,
        page: 0,
        size: 20,
        totalElements: publicacoes.length,
        totalPages: publicacoes.length > 0 ? 1 : 0,
      };
      return route.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify(pagina),
      });
    },
  );
  return publicacoes;
}

/** Lista de cursos no formato de `Curso` do `openapi.yaml` (o seed real tem 26). */
export const CURSOS_MOCK = [
  { id: 1, nome: 'Administração' },
  { id: 14, nome: 'Engenharia de Software' },
];

/** `GET /cursos` -> 200. A tela de cadastro busca a lista do select assim que abre. */
export function mockCursosOk(page: Page): Promise<void> {
  return rota(page, (url) => ehApi(url) && url.pathname === '/cursos', 200, JSON.stringify(CURSOS_MOCK));
}
