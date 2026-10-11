import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';
import { AuthService, JWT_ROLES_CLAIM } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import { Shell } from './shell';

const TOKEN_KEY = 'pacext.token';

const ITENS_MODERACAO = ['Denúncias', 'Solicitações de fixação'];

/** Ordem exata da tabela "Navegação global" de EXPERIENCE.md. */
const ORDEM_COMPLETA = [
  'Início',
  'Buscar',
  'Mensagens',
  'Notificações',
  'Criar enquete',
  'Denúncias',
  'Solicitações de fixação',
  'Suas comunidades',
  'Descobrir comunidades',
];

/** A mesma ordem, sem os dois itens de moderação (o que um aluno enxerga). */
const ITENS_COMUNS = ORDEM_COMPLETA.filter((label) => !ITENS_MODERACAO.includes(label));

/** Base64url (sem padding) de uma string UTF-8. */
function base64url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((byte) => (binario += String.fromCharCode(byte)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** JWT com forma real do backend: o perfil vai sob a claim `JWT_ROLES_CLAIM`. */
function tokenComPerfis(perfis: string[]): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: 'user-1', [JWT_ROLES_CLAIM]: perfis }));
  return `${header}.${payload}.assinatura-ignorada`;
}

describe('Shell', () => {
  let fixture: ComponentFixture<Shell> | undefined;

  async function montar(token: string | null): Promise<ComponentFixture<Shell>> {
    localStorage.clear();
    if (token !== null) {
      localStorage.setItem(TOKEN_KEY, token);
    }

    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'feed',
            loadComponent: () => import('../../features/feed/feed').then((m) => m.Feed),
          },
        ]),
      ],
    }).compileComponents();

    const criado = TestBed.createComponent(Shell);
    document.body.appendChild(criado.nativeElement);
    criado.detectChanges();
    await criado.whenStable();
    criado.detectChanges();
    fixture = criado;
    return criado;
  }

  function labelsDeNav(f: ComponentFixture<Shell>): string[] {
    return [...f.nativeElement.querySelectorAll('.shell__nav-item')].map((el) =>
      (el.textContent ?? '').trim(),
    );
  }

  function avatarBtn(f: ComponentFixture<Shell>): HTMLButtonElement {
    return f.nativeElement.querySelector('.shell__avatar') as HTMLButtonElement;
  }

  function abrirMenu(f: ComponentFixture<Shell>): void {
    avatarBtn(f).click();
    f.detectChanges();
  }

  function itensDoMenu(f: ComponentFixture<Shell>): HTMLButtonElement[] {
    return [...f.nativeElement.querySelectorAll('[role="menuitem"]')] as HTMLButtonElement[];
  }

  afterEach(() => {
    fixture?.nativeElement.remove();
    fixture = undefined;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('cria o componente', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    expect(f.componentInstance).toBeTruthy();
  });

  it('aluno: mostra os sete itens comuns e nenhum item de moderação', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));

    expect(labelsDeNav(f)).toEqual(ITENS_COMUNS);
    for (const item of ITENS_MODERACAO) {
      expect(labelsDeNav(f)).not.toContain(item);
    }
  });

  it('mostra as comunidades do usuário sob "Suas comunidades" (Epic 2)', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([
      {
        id: 1,
        nome: 'Engenharia de Software',
        descricao: null,
        tipo: 'CURSO',
        souMembro: true,
        criadoEm: '2026-01-01T00:00:00Z',
      },
      { id: 2, nome: 'Clube de Xadrez', descricao: null, tipo: 'ABERTA', souMembro: true, criadoEm: '2026-01-02T00:00:00Z' },
    ]);
    f.detectChanges();

    const itens = [...f.nativeElement.querySelectorAll('.shell__comunidade-item')].map((el) =>
      (el.textContent ?? '').trim(),
    );
    expect(itens).toEqual(['Engenharia de Software', 'Clube de Xadrez']);
  });

  it('sem comunidades: mostra o estado vazio sob "Suas comunidades"', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([]);
    f.detectChanges();

    const vazio = f.nativeElement.querySelector('.shell__comunidade-item--vazio');
    expect((vazio?.textContent ?? '').trim()).toBe('Você ainda não faz parte de nenhuma');
  });

  it('aluno: dropdown expõe Perfil, Configurações e Sair', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    abrirMenu(f);

    expect(itensDoMenu(f).map((b) => (b.textContent ?? '').trim())).toEqual([
      'Perfil',
      'Configurações',
      'Sair',
    ]);
  });

  it('moderador: Denúncias e Solicitações de fixação entram entre "Criar enquete" e "Suas comunidades"', async () => {
    const f = await montar(tokenComPerfis(['MODERADOR']));

    expect(labelsDeNav(f)).toEqual(ORDEM_COMPLETA);
  });

  it('administrador: mesma ordem completa do moderador', async () => {
    const f = await montar(tokenComPerfis(['ADMINISTRADOR']));

    expect(labelsDeNav(f)).toEqual(ORDEM_COMPLETA);
  });

  it('token malformado: itens de moderação escondidos, sem lançar', async () => {
    const f = await montar('isto-nao-e-um-jwt');

    expect(labelsDeNav(f)).toEqual(ITENS_COMUNS);
  });

  it('a sidebar é um landmark <nav> com rótulo (não dentro de <aside>)', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    const nav = f.nativeElement.querySelector('nav.shell__sidebar') as HTMLElement;

    expect(nav).toBeTruthy();
    expect(nav.getAttribute('aria-label')).toBeTruthy();
    expect(f.nativeElement.querySelector('aside')).toBeNull();
  });

  it('item sem rota é um <span aria-disabled> não focável e sem href', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    const buscar = [...f.nativeElement.querySelectorAll('.shell__nav-item')].find(
      (el) => (el.textContent ?? '').trim() === 'Buscar',
    ) as HTMLElement;

    expect(buscar.tagName).toBe('SPAN');
    expect(buscar.getAttribute('aria-disabled')).toBe('true');
    expect(buscar.hasAttribute('href')).toBe(false);
    expect(buscar.tabIndex).toBeLessThan(0);
  });

  it('"Início" recebe aria-current="page" quando /feed está ativa (Descobrir comunidades não)', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));

    // "Início" e "Descobrir comunidades" (Épico 2) são os dois itens com rota hoje —
    // os outros continuam inertes (<span>), então isto não volta a ser 1 sozinho.
    const links = [...f.nativeElement.querySelectorAll('a.shell__nav-item')];
    expect(links).toHaveLength(2);
    const inicio = links.find((el) => (el.textContent ?? '').trim() === 'Início') as HTMLAnchorElement;
    const descobrir = links.find((el) => (el.textContent ?? '').trim() === 'Descobrir comunidades') as HTMLAnchorElement;
    expect(inicio).toBeTruthy();
    expect(descobrir).toBeTruthy();
    expect(inicio.getAttribute('aria-current')).toBeNull();

    await TestBed.inject(Router).navigateByUrl('/feed');
    f.detectChanges();

    expect(inicio.getAttribute('aria-current')).toBe('page');
    expect(inicio.classList.contains('shell__nav-item--active')).toBe(true);
    expect(descobrir.getAttribute('aria-current')).toBeNull();
  });

  it('clicar no avatar abre o dropdown e marca aria-expanded="true"', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    const botao = avatarBtn(f);

    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(f.nativeElement.querySelector('[role="menu"]')).toBeNull();

    abrirMenu(f);

    expect(botao.getAttribute('aria-expanded')).toBe('true');
    expect(f.nativeElement.querySelector('[role="menu"]')).toBeTruthy();
  });

  it('Escape fecha o dropdown e devolve o foco ao avatar', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    abrirMenu(f);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    f.detectChanges();

    expect(avatarBtn(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(avatarBtn(f));
  });

  it('clique fora fecha o dropdown e devolve o foco ao avatar', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    abrirMenu(f);

    document.body.click();
    f.detectChanges();

    expect(avatarBtn(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(avatarBtn(f));
  });

  it('ativar um item inerte (Configurações) fecha o dropdown e devolve o foco ao avatar', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    abrirMenu(f);

    const configuracoes = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === 'Configurações')!;
    configuracoes.click();
    f.detectChanges();

    expect(avatarBtn(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(avatarBtn(f));
  });

  it('Perfil fecha o dropdown e navega para /perfil (Stories 4.1/4.2)', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    abrirMenu(f);

    const perfil = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === 'Perfil')!;
    expect(perfil.getAttribute('aria-disabled')).toBeNull();
    perfil.click();
    f.detectChanges();

    expect(avatarBtn(f).getAttribute('aria-expanded')).toBe('false');
    expect(navegar).toHaveBeenCalledWith('/perfil');
  });

  it('Configurações é aria-disabled e não altera a rota ao ser ativado', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    const router = TestBed.inject(Router);
    const urlAntes = router.url;

    for (const label of ['Configurações']) {
      abrirMenu(f);
      const item = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === label)!;
      expect(item.getAttribute('aria-disabled')).toBe('true');
      item.click();
      f.detectChanges();
      expect(router.url).toBe(urlAntes);
    }
  });

  it('o dropdown expõe id + aria-label e o avatar aponta para ele via aria-controls', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    abrirMenu(f);

    const menu = f.nativeElement.querySelector('[role="menu"]') as HTMLElement;
    expect(menu.id).toBe('shell-menu');
    expect(menu.getAttribute('aria-label')).toBe('Conta');
    expect(avatarBtn(f).getAttribute('aria-controls')).toBe('shell-menu');
  });

  it('Tab para fora do dropdown (foco sai do menu) fecha sem devolver o foco ao avatar', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    abrirMenu(f);

    const sair = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === 'Sair')!;
    sair.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
    f.detectChanges();

    expect(avatarBtn(f).getAttribute('aria-expanded')).toBe('false');
    expect(f.nativeElement.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).not.toBe(avatarBtn(f));
  });

  it('foco movendo entre itens do próprio dropdown não o fecha', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    abrirMenu(f);

    const [perfil, , sair] = itensDoMenu(f);
    perfil.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: sair }));
    f.detectChanges();

    expect(avatarBtn(f).getAttribute('aria-expanded')).toBe('true');
    expect(f.nativeElement.querySelector('[role="menu"]')).toBeTruthy();
  });

  it('Sair chama AuthService.logout() e navega para /login', async () => {
    const f = await montar(tokenComPerfis(['ALUNO']));
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const logoutSpy = vi.spyOn(auth, 'logout').mockImplementation(() => undefined);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    abrirMenu(f);
    const sair = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === 'Sair')!;
    sair.click();
    f.detectChanges();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
    expect(navSpy).toHaveBeenCalledWith('/login');
    expect(avatarBtn(f).getAttribute('aria-expanded')).toBe('false');
  });
  describe('Denúncias (Epic 12)', () => {
    function linkDenuncias(f: ComponentFixture<Shell>): HTMLAnchorElement {
      return [...f.nativeElement.querySelectorAll('a.shell__nav-item')].find((a) =>
        (a.textContent ?? '').includes('Denúncias'),
      ) as HTMLAnchorElement;
    }

    it('moderador: "Denúncias" leva à fila e mostra o contador de pendentes', async () => {
      const f = await montar(tokenComPerfis(['MODERADOR']));
      const httpMock = TestBed.inject(HttpTestingController);

      const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/moderacao/denuncias`);
      expect(req.request.params.get('situacao')).toBe('PENDENTE');
      req.flush({ content: [], page: 0, size: 1, totalElements: 3, totalPages: 3 });
      f.detectChanges();

      const link = linkDenuncias(f);
      expect(link.getAttribute('href')).toBe('/moderacao/denuncias');
      expect(link.querySelector('.contador')?.textContent?.trim()).toBe('3');
      expect(link.querySelector('.contador')?.getAttribute('aria-label')).toBe('3 pendentes');
    });

    it('moderador sem pendentes: sem contador', async () => {
      const f = await montar(tokenComPerfis(['MODERADOR']));
      TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url === `${API_BASE_URL}/moderacao/denuncias`)
        .flush({ content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 });
      f.detectChanges();

      expect(linkDenuncias(f).querySelector('.contador')).toBeNull();
    });

    it('aluno: não busca a fila de denúncias', async () => {
      await montar(tokenComPerfis(['ALUNO']));

      TestBed.inject(HttpTestingController).expectNone((r) => r.url === `${API_BASE_URL}/moderacao/denuncias`);
    });
  });
});

describe('Shell - painel de notificações (Story 10.1)', () => {
  let fixture: ComponentFixture<Shell> | undefined;

  async function montar(): Promise<{ f: ComponentFixture<Shell>; httpMock: HttpTestingController }> {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, tokenComPerfis(['ALUNO']));

    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'feed',
            loadComponent: () => import('../../features/feed/feed').then((m) => m.Feed),
          },
          {
            path: 'perfil',
            loadComponent: () => import('../../features/perfil/meu-perfil/meu-perfil').then((m) => m.MeuPerfil),
          },
        ]),
      ],
    }).compileComponents();

    const criado = TestBed.createComponent(Shell);
    document.body.appendChild(criado.nativeElement);
    criado.detectChanges();
    await criado.whenStable();
    criado.detectChanges();
    fixture = criado;

    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.match(`${API_BASE_URL}/comunidades/minhas`).forEach((req) => req.flush([]));
    return { f: criado, httpMock };
  }

  function sininhoBtn(f: ComponentFixture<Shell>): HTMLButtonElement {
    return f.nativeElement.querySelector('.shell__nav-item--button') as HTMLButtonElement;
  }

  function flushNotificacoes(
    httpMock: HttpTestingController,
    notificacoes: { id: number; tipo: string; texto: string; link: string | null; lida: boolean; criadoEm: string }[] = [],
  ): void {
    for (const req of httpMock.match(`${API_BASE_URL}/notificacoes/me?pagina=0&tamanho=20`)) {
      req.flush({ content: notificacoes, page: 0, size: 20, totalElements: notificacoes.length, totalPages: 1 });
    }
  }

  afterEach(() => {
    fixture?.nativeElement.remove();
    fixture = undefined;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sem não lidas: sem badge e aria-label é só "Notificações"', async () => {
    const { f, httpMock } = await montar();
    flushNotificacoes(httpMock);
    f.detectChanges();

    const botao = sininhoBtn(f);
    expect(botao.querySelector('.shell__nav-badge')).toBeNull();
    expect(botao.getAttribute('aria-label')).toBe('Notificações');
  });

  it('com não lidas: mostra o badge e o aria-label inclui a contagem', async () => {
    const { f, httpMock } = await montar();
    flushNotificacoes(httpMock, [
      { id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'Complete seu perfil', link: '/perfil', lida: false, criadoEm: '2026-09-30T12:00:00Z' },
    ]);
    f.detectChanges();

    const botao = sininhoBtn(f);
    expect(botao.querySelector('.shell__nav-badge')?.textContent?.trim()).toBe('1');
    expect(botao.getAttribute('aria-label')).toBe('Notificações (1 não lidas)');
  });

  it('clicar no sininho abre o painel, recarrega e marca aria-expanded="true"', async () => {
    const { f, httpMock } = await montar();
    flushNotificacoes(httpMock);
    f.detectChanges();

    const botao = sininhoBtn(f);
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(f.nativeElement.querySelector('#shell-notificacoes')).toBeNull();

    botao.click();
    f.detectChanges();
    flushNotificacoes(httpMock, [
      { id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'Complete seu perfil', link: '/perfil', lida: false, criadoEm: '2026-09-30T12:00:00Z' },
    ]);
    f.detectChanges();

    expect(botao.getAttribute('aria-expanded')).toBe('true');
    const painel = f.nativeElement.querySelector('#shell-notificacoes');
    expect(painel).toBeTruthy();
    expect(painel.textContent).toContain('Complete seu perfil');
  });

  it('painel vazio mostra "Sem notificações por enquanto."', async () => {
    const { f, httpMock } = await montar();
    flushNotificacoes(httpMock);
    f.detectChanges();

    sininhoBtn(f).click();
    f.detectChanges();
    flushNotificacoes(httpMock);
    f.detectChanges();

    const vazio = f.nativeElement.querySelector('.shell__notificacao-item--vazio') as HTMLElement;
    expect(vazio.textContent?.trim()).toBe('Sem notificações por enquanto.');
    expect(vazio.getAttribute('role')).toBe('menuitem');
    expect(vazio.getAttribute('aria-disabled')).toBe('true');
  });

  it('clicar numa notificação não lida marca como lida, fecha o painel e navega para o link', async () => {
    const { f, httpMock } = await montar();
    flushNotificacoes(httpMock);
    f.detectChanges();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    sininhoBtn(f).click();
    f.detectChanges();
    flushNotificacoes(httpMock, [
      { id: 7, tipo: 'ONBOARDING_PERFIL', texto: 'Complete seu perfil', link: '/perfil', lida: false, criadoEm: '2026-09-30T12:00:00Z' },
    ]);
    f.detectChanges();

    const item = f.nativeElement.querySelector('.shell__notificacao-item') as HTMLButtonElement;
    item.click();
    f.detectChanges();

    httpMock.expectOne(`${API_BASE_URL}/notificacoes/7/lida`).flush(null);

    expect(sininhoBtn(f).getAttribute('aria-expanded')).toBe('false');
    expect(navSpy).toHaveBeenCalledWith('/perfil');
  });

  it('abrir o painel de notificações fecha o dropdown da conta', async () => {
    const { f, httpMock } = await montar();
    flushNotificacoes(httpMock);
    f.detectChanges();

    (f.nativeElement.querySelector('.shell__avatar') as HTMLButtonElement).click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('#shell-menu')).toBeTruthy();

    sininhoBtn(f).click();
    f.detectChanges();
    flushNotificacoes(httpMock);
    f.detectChanges();

    // #shell-menu (dropdown da conta), não [role="menu"] genérico - o painel de
    // notificações também usa role="menu" e continua aberto aqui de propósito.
    expect(f.nativeElement.querySelector('#shell-menu')).toBeNull();
    expect(f.nativeElement.querySelector('#shell-notificacoes')).toBeTruthy();
  });
});

describe('shell.scss - contrato de estilo por token', () => {
  const scss = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'shell.scss'), 'utf8');
  const semComentarios = scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('referencia var(--uc-* ao menos uma vez', () => {
    expect(semComentarios).toMatch(/var\(\s*--uc-/);
  });

  it('não tem literal de cor hexadecimal', () => {
    expect(semComentarios).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('não tem font-size hardcoded (número ou hex)', () => {
    expect(semComentarios).not.toMatch(/font-size:\s*[0-9#]/);
  });

  it('toda declaração de color usa var(--uc-*), inherit ou currentColor', () => {
    const offenders = [...semComentarios.matchAll(/(?:^|[^-])color:\s*([^;{]+)/g)]
      .map((m) => m[1].trim())
      .filter(
        (valor) =>
          !/^var\(\s*--uc-[a-z0-9-]+\s*\)$/.test(valor) && !/^(inherit|currentColor)$/i.test(valor),
      );
    expect(offenders).toEqual([]);
  });
});
