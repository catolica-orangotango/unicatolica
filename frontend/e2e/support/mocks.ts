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
  // `ehApi`: `/comunidades` também é rota do Angular (lista de descoberta).
  await rota(page, (url) => ehApi(url) && url.pathname === '/comunidades/minhas', 200, JSON.stringify([]));
  await rota(page, (url) => ehApi(url) && url.pathname === '/comunidades', 200, JSON.stringify(paginaVazia));
  // A shell busca as notificações ao montar; sem mock, o ERR_CONNECTION_REFUSED vai para o console.
  await mockNotificacoes(page, []);
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

/** Perfil no formato de `Perfil` do `openapi.yaml`. */
export interface PerfilMock {
  usuarioId: number;
  nome: string;
  curso: { id: number; nome: string } | null;
  periodo: number | null;
  interesses: string[];
}

/**
 * `GET`/`PUT /perfil/me` (Stories 4.1/4.2) com estado em memória: o `PUT` grava e um
 * `GET` depois (reload) devolve o salvo, como o backend real. O curso vem de
 * {@link CURSOS_MOCK} pelo `cursoId`. Registrar depois de `mockFeedOk`.
 *
 * `marcarLidaAoSalvar` reproduz o efeito colateral real da Story 4.3: salvar o perfil
 * marca a notificação "complete seu perfil" como lida no backend. Passe a lista mutável
 * de {@link mockNotificacoes} e o id da notificação para simular isso no `PUT`.
 */
export async function mockMeuPerfil(
  page: Page,
  inicial: PerfilMock,
  opcoes?: { marcarLidaAoSalvar?: { notificacoes: NotificacaoMock[]; id: number } },
): Promise<void> {
  let atual = { ...inicial };
  await page.route(
    (url) => ehApi(url) && url.pathname === '/perfil/me',
    (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-methods': 'GET,PUT,OPTIONS' } });
      }
      if (request.method() === 'PUT') {
        const corpo = request.postDataJSON() as { nome: string; cursoId: number; periodo: number; interesses: string[] };
        atual = {
          usuarioId: atual.usuarioId,
          nome: corpo.nome.trim(),
          curso: CURSOS_MOCK.find((c) => c.id === corpo.cursoId) ?? null,
          periodo: corpo.periodo,
          interesses: [...corpo.interesses].sort((a, b) => a.localeCompare(b)),
        };
        if (opcoes?.marcarLidaAoSalvar) {
          const { notificacoes, id } = opcoes.marcarLidaAoSalvar;
          const notificacao = notificacoes.find((n) => n.id === id);
          if (notificacao) {
            notificacao.lida = true;
          }
        }
      }
      return route.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify(atual),
      });
    },
  );
}

/** `GET /usuarios/{id}/perfil` (Story 4.4) -> 200 com o perfil dado. */
export function mockPerfilDeUsuario(page: Page, perfil: PerfilMock): Promise<void> {
  return rota(
    page,
    (url) => ehApi(url) && url.pathname === `/usuarios/${perfil.usuarioId}/perfil`,
    200,
    JSON.stringify(perfil),
  );
}

/** Notificação no formato de `Notificacao` do `openapi.yaml` (Story 10.1). */
export interface NotificacaoMock {
  id: number;
  tipo: string;
  texto: string;
  link: string | null;
  lida: boolean;
  criadoEm: string;
}

/**
 * `GET /notificacoes/me` e `POST /notificacoes/{id}/lida` (Story 10.1) com estado em
 * memória — a mesma lista alimenta o badge e o painel da sidebar, e uma notificação
 * marcada como lida (pelo painel ou como efeito colateral de outra rota — ver o
 * `marcarLida` opcional em {@link mockMeuPerfil}) reflete no próximo `GET`. Registrar
 * depois de `mockFeedOk`.
 */
export async function mockNotificacoes(page: Page, iniciais: NotificacaoMock[]): Promise<NotificacaoMock[]> {
  const notificacoes = iniciais.map((n) => ({ ...n }));
  await page.route(
    (url) => ehApi(url) && /^\/notificacoes(\/|$)/.test(url.pathname),
    (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: { ...CORS, 'access-control-allow-methods': 'GET,POST,OPTIONS' },
        });
      }
      const alvo = /^\/notificacoes\/(\d+)\/lida$/.exec(new URL(request.url()).pathname);
      if (request.method() === 'POST' && alvo) {
        const notificacao = notificacoes.find((n) => n.id === Number(alvo[1]));
        if (notificacao) {
          notificacao.lida = true;
        }
        return route.fulfill({ status: 204, headers: CORS });
      }
      return route.fulfill(
        json(200, {
          content: notificacoes,
          page: 0,
          size: 20,
          totalElements: notificacoes.length,
          totalPages: notificacoes.length > 0 ? 1 : 0,
        }),
      );
    },
  );
  return notificacoes;
}

/** Denúncia no formato de `Denuncia` do `openapi.yaml` — sem campo do denunciante (RF77.1). */
export interface DenunciaMock {
  id: number;
  conteudo: {
    tipo: 'PUBLICACAO';
    id: number;
    texto: string;
    autor: { id: number; nome: string; curso: string | null };
    comunidadeId: number | null;
    criadoEm: string;
    situacao: 'VISIVEL' | 'OCULTO';
  };
  motivo: string;
  situacao: 'PENDENTE' | 'RESOLVIDA' | 'DESCARTADA';
  criadoEm: string;
  resolvidaEm: string | null;
}

function json(status: number, body: unknown) {
  return { status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

/**
 * Fila do moderador (Stories 12.4/12.5) com estado em memória: `GET /moderacao/denuncias`
 * filtra por `situacao` e pagina; ocultar resolve as pendentes da mesma postagem,
 * restaurar volta a postagem a VISIVEL, descartar encerra só a denúncia — como o backend.
 * Registrar depois de `mockFeedOk`.
 */
export async function mockModeracao(page: Page, iniciais: DenunciaMock[]): Promise<DenunciaMock[]> {
  const denuncias = iniciais.map((d) => ({ ...d, conteudo: { ...d.conteudo } }));
  await page.route(
    (url) => ehApi(url) && url.pathname.startsWith('/moderacao/denuncias'),
    (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      const url = new URL(request.url());
      const acao = /^\/moderacao\/denuncias\/(\d+)\/(ocultacao|restauracao|descarte)$/.exec(url.pathname);
      if (request.method() === 'POST' && acao) {
        const alvo = denuncias.find((d) => d.id === Number(acao[1]));
        if (!alvo) {
          return route.fulfill(json(404, { error: { code: 'DENUNCIA_NAO_ENCONTRADA', message: 'Denúncia não encontrada.' } }));
        }
        const agora = new Date().toISOString();
        if (acao[2] === 'ocultacao') {
          for (const d of denuncias.filter((x) => x.conteudo.id === alvo.conteudo.id)) {
            d.conteudo.situacao = 'OCULTO';
            if (d.situacao === 'PENDENTE') {
              d.situacao = 'RESOLVIDA';
              d.resolvidaEm = agora;
            }
          }
        } else if (acao[2] === 'restauracao') {
          denuncias.filter((x) => x.conteudo.id === alvo.conteudo.id).forEach((d) => (d.conteudo.situacao = 'VISIVEL'));
        } else {
          alvo.situacao = 'DESCARTADA';
          alvo.resolvidaEm = agora;
        }
        return route.fulfill(json(200, alvo));
      }
      const situacao = url.searchParams.get('situacao') ?? 'PENDENTE';
      const tamanho = Number(url.searchParams.get('tamanho') ?? '20');
      const filtradas = denuncias.filter((d) => d.situacao === situacao);
      return route.fulfill(
        json(200, {
          content: filtradas.slice(0, tamanho),
          page: 0,
          size: tamanho,
          totalElements: filtradas.length,
          totalPages: Math.ceil(filtradas.length / tamanho),
        }),
      );
    },
  );
  return denuncias;
}

/** `POST /denuncias` (Story 12.1) -> 201. Devolve os corpos recebidos, para o teste conferir. */
export async function mockDenunciar(page: Page): Promise<unknown[]> {
  const recebidas: unknown[] = [];
  await page.route(
    (url) => ehApi(url) && url.pathname === '/denuncias',
    (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      recebidas.push(route.request().postDataJSON());
      return route.fulfill(json(201, { id: 900 + recebidas.length, criadoEm: new Date().toISOString() }));
    },
  );
  return recebidas;
}

/** `POST /comunidades` (Story 2.2) com estado; nome em `nomesEmUso` → 409. Registrar após `mockFeedOk`. */
export async function mockCriarComunidade(
  page: Page,
  opcoes: { id: number; nomesEmUso?: string[] },
): Promise<unknown[]> {
  const recebidas: unknown[] = [];
  const minhas: unknown[] = [];

  await page.route(
    (url) => ehApi(url) && url.pathname === '/comunidades',
    (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      if (request.method() !== 'POST') {
        return route.fallback();
      }
      const corpo = request.postDataJSON() as { nome: string; descricao: string | null };
      recebidas.push(corpo);
      if (opcoes.nomesEmUso?.includes(corpo.nome)) {
        return route.fulfill({
          status: 409,
          headers: { ...CORS, 'content-type': 'application/json' },
          body: envelopeErro('COMUNIDADE_NOME_EM_USO', 'Já existe uma comunidade com esse nome.'),
        });
      }
      const criada = {
        id: opcoes.id,
        nome: corpo.nome,
        descricao: corpo.descricao,
        tipo: 'ABERTA',
        criadoEm: new Date().toISOString(),
      };
      minhas.push(criada);
      return route.fulfill(json(201, criada));
    },
  );
  await page.route(
    (url) => ehApi(url) && url.pathname === '/comunidades/minhas',
    (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 204, headers: CORS })
        : route.fulfill(json(200, minhas)),
  );
  return recebidas;
}

/** Membro no formato de `MembroComunidadeResponse` do `openapi.yaml`. */
export interface MembroMock {
  usuarioId: number;
  nome: string;
  curso: string | null;
  papel: 'ADMINISTRADOR' | 'MEMBRO';
  membroDesde: string;
}

/**
 * Administração da comunidade (Story 2.6) com estado: `GET`/`PATCH`/`DELETE /comunidades/{id}`,
 * `GET /comunidades/{id}/membros` e `DELETE /comunidades/{id}/membros/{usuarioId}`. Devolve as
 * chamadas recebidas. Registrar depois de `mockComunidadeComFeed`, que cobre o feed.
 */
export async function mockAdministrarComunidade(
  page: Page,
  opcoes: { id: number; nome: string; descricao: string | null; membros: MembroMock[] },
): Promise<{ metodo: string; caminho: string; corpo: unknown }[]> {
  const chamadas: { metodo: string; caminho: string; corpo: unknown }[] = [];
  const comunidade = {
    id: opcoes.id,
    nome: opcoes.nome,
    descricao: opcoes.descricao,
    tipo: 'ABERTA',
    souMembro: true,
    souAdministrador: true,
    criadoEm: '2026-08-01T00:00:00Z',
  };
  let membros = [...opcoes.membros];
  const base = `/comunidades/${opcoes.id}`;

  await page.route(
    (url) => ehApi(url) && (url.pathname === base || url.pathname.startsWith(`${base}/membros`)),
    (route) => {
      const request = route.request();
      const caminho = new URL(request.url()).pathname;
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      if (request.method() !== 'GET') {
        chamadas.push({ metodo: request.method(), caminho, corpo: request.postDataJSON() });
      }
      if (caminho === base && request.method() === 'PATCH') {
        const corpo = request.postDataJSON() as { nome?: string; descricao?: string };
        if (corpo.nome !== undefined) comunidade.nome = corpo.nome;
        if (corpo.descricao !== undefined) comunidade.descricao = corpo.descricao || null;
        return route.fulfill(json(200, comunidade));
      }
      if (caminho === base && request.method() === 'DELETE') {
        return route.fulfill({ status: 204, headers: CORS });
      }
      if (caminho === base) {
        return route.fulfill(json(200, comunidade));
      }
      if (caminho === `${base}/membros` && request.method() === 'GET') {
        return route.fulfill(
          json(200, { content: membros, page: 0, size: 100, totalElements: membros.length, totalPages: 1 }),
        );
      }
      const usuarioId = Number(caminho.split('/').pop());
      membros = membros.filter((m) => m.usuarioId !== usuarioId);
      return route.fulfill({ status: 204, headers: CORS });
    },
  );
  return chamadas;
}

/** Curso no formato de `CursoAdmin` do `openapi.yaml` (KAN-44). */
export interface CursoAdminMock {
  id: number;
  nome: string;
  ativo: boolean;
}

/**
 * Administração de cursos (KAN-44) com estado em memória: `GET /admin/cursos` (todos),
 * `POST /cursos`, `PUT /cursos/{id}` e `GET /cursos` (só os ativos, como o backend; é o que o
 * cadastro de aluno carrega). Devolve as chamadas de escrita recebidas. Registrar depois de
 * `mockFeedOk`.
 */
export async function mockCursosAdmin(
  page: Page,
  inicial: CursoAdminMock[],
): Promise<{ metodo: string; caminho: string; corpo: unknown }[]> {
  const chamadas: { metodo: string; caminho: string; corpo: unknown }[] = [];
  const cursos = inicial.map((c) => ({ ...c }));
  let proximoId = Math.max(0, ...cursos.map((c) => c.id)) + 1;
  const ordenados = () => [...cursos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const erro = (status: number, code: string, message: string) =>
    json(status, { error: { code, message, details: null } });

  await page.route(
    (url) => ehApi(url) && (url.pathname === '/admin/cursos' || url.pathname.startsWith('/cursos')),
    (route) => {
      const request = route.request();
      const caminho = new URL(request.url()).pathname;
      if (request.method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: { ...CORS, 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' },
        });
      }
      // Só `GET /cursos` é público; as demais rotas exigem token, como o backend (KAN-88).
      const publica = caminho === '/cursos' && request.method() === 'GET';
      if (!publica && !request.headers()['authorization']) {
        return route.fulfill(erro(401, 'NAO_AUTENTICADO', 'Token JWT ausente.'));
      }
      if (request.method() !== 'GET') {
        chamadas.push({ metodo: request.method(), caminho, corpo: request.postDataJSON() });
      }
      if (caminho === '/admin/cursos') {
        return route.fulfill(json(200, ordenados()));
      }
      if (caminho === '/cursos' && request.method() === 'GET') {
        return route.fulfill(
          json(200, ordenados().filter((c) => c.ativo).map(({ id, nome }) => ({ id, nome }))),
        );
      }
      if (caminho === '/cursos' && request.method() === 'POST') {
        const { nome } = request.postDataJSON() as { nome: string };
        if (cursos.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
          return route.fulfill(erro(409, 'CURSO_NOME_EM_USO', 'Já existe um curso com esse nome.'));
        }
        const criado = { id: proximoId++, nome, ativo: true };
        cursos.push(criado);
        return route.fulfill(json(201, criado));
      }
      const curso = cursos.find((c) => c.id === Number(caminho.split('/').pop()));
      if (!curso) {
        return route.fulfill(erro(404, 'CURSO_NAO_ENCONTRADO', 'Curso não encontrado.'));
      }
      const corpo = request.postDataJSON() as { nome: string; ativo: boolean };
      curso.nome = corpo.nome;
      curso.ativo = corpo.ativo;
      return route.fulfill(json(200, curso));
    },
  );
  return chamadas;
}
