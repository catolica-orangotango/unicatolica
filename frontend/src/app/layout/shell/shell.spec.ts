import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';
import { routes as rotasDoApp } from '../../app.routes';
import { AuthService, JWT_ROLES_CLAIM } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import { Shell } from './shell';
import { ShellLateralService } from './shell-lateral.service';

const TOKEN_KEY = 'pacext.token';

/** Menu principal do aluno (KAN-91), na ordem do mockup aprovado. */
const MENU_ALUNO = ['Início', 'Comunidades', 'Notificações', 'Perfil'];

/** O moderador ganha "Denúncias" logo depois de "Comunidades". */
const MENU_MODERADOR = ['Início', 'Comunidades', 'Denúncias', 'Notificações', 'Perfil'];

/** O administrador: o do moderador mais "Administração" no fim. */
const MENU_ADMINISTRADOR = [...MENU_MODERADOR, 'Administração'];

/** Seção "Em breve" (itens inertes) do aluno. */
const EM_BREVE_ALUNO = ['Busca', 'Mensagens', 'Criar enquete'];

/** Moderador e administrador ainda veem "Solicitações de fixação". */
const EM_BREVE_PRIVILEGIADO = [...EM_BREVE_ALUNO, 'Solicitações de fixação'];

/** Base64url (sem padding) de uma string UTF-8. */
function base64url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((byte) => (binario += String.fromCharCode(byte)));
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** JWT com forma real do backend: o perfil vai sob a claim `JWT_ROLES_CLAIM`. */
function tokenComPerfis(perfis: string[], sub = 'user-1'): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub, [JWT_ROLES_CLAIM]: perfis }));
  return `${header}.${payload}.assinatura-ignorada`;
}

/** Tela vazia para as rotas de teste que só precisam existir. */
@Component({ template: '' })
class TelaVazia {}

/** Host mínimo que registra um template na coluna lateral da casca. */
@Component({
  imports: [],
  template: '<ng-template #lateral><p class="conteudo-lateral">Agenda da semana</p></ng-template>',
})
class HostLateral {
  readonly lateral = viewChild.required<TemplateRef<unknown>>('lateral');
}

const COMUNIDADES = [
  {
    id: 1,
    nome: 'Engenharia de Software',
    descricao: null,
    tipo: 'CURSO',
    souMembro: true,
    criadoEm: '2026-01-01T00:00:00Z',
  },
  { id: 2, nome: 'Clube de Xadrez', descricao: null, tipo: 'ABERTA', souMembro: true, criadoEm: '2026-01-02T00:00:00Z' },
];

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
          { path: 'comunidades', component: TelaVazia, data: { largo: true } },
          {
            path: 'comunidades/:id',
            loadComponent: () =>
              import('../../features/comunidades/comunidade-detalhe/comunidade-detalhe').then(
                (m) => m.ComunidadeDetalhe,
              ),
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

  function textos(f: ComponentFixture<Shell>, seletor: string): string[] {
    return [...f.nativeElement.querySelectorAll(seletor)].map((el) => (el.textContent ?? '').trim());
  }

  function labelsDeNav(f: ComponentFixture<Shell>): string[] {
    return textos(f, '.shell__nav-item .shell__nav-rotulo');
  }

  function itemDeNav(f: ComponentFixture<Shell>, label: string): HTMLElement {
    return [...f.nativeElement.querySelectorAll('.shell__nav-item')].find(
      (el) => (el.querySelector('.shell__nav-rotulo')?.textContent ?? '').trim() === label,
    ) as HTMLElement;
  }

  function cartaoConta(f: ComponentFixture<Shell>): HTMLButtonElement {
    return f.nativeElement.querySelector('.shell__conta') as HTMLButtonElement;
  }

  function abrirMenu(f: ComponentFixture<Shell>): void {
    cartaoConta(f).click();
    f.detectChanges();
  }

  function itensDoMenu(f: ComponentFixture<Shell>): HTMLButtonElement[] {
    return [...f.nativeElement.querySelectorAll('#shell-menu-conta [role="menuitem"]')] as HTMLButtonElement[];
  }

  function painelDaConta(f: ComponentFixture<Shell>): HTMLElement | null {
    return f.nativeElement.querySelector('#shell-menu-conta [role="menu"]');
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

  describe('menu principal (KAN-91)', () => {
    it('aluno: Início, Comunidades, Notificações e Perfil, nessa ordem', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));

      expect(labelsDeNav(f)).toEqual(MENU_ALUNO);
    });

    it('moderador: "Denúncias" entra depois de "Comunidades"', async () => {
      const f = await montar(tokenComPerfis(['MODERADOR']));

      expect(labelsDeNav(f)).toEqual(MENU_MODERADOR);
    });

    it('administrador: o menu do moderador mais "Administração" no fim', async () => {
      const f = await montar(tokenComPerfis(['ADMINISTRADOR']));

      expect(labelsDeNav(f)).toEqual(MENU_ADMINISTRADOR);
    });

    it('aluno e moderador não veem "Administração"', async () => {
      for (const perfil of ['ALUNO', 'MODERADOR']) {
        TestBed.resetTestingModule();
        const f = await montar(tokenComPerfis([perfil]));

        expect(labelsDeNav(f)).not.toContain('Administração');
      }
    });

    it('token malformado: menu do aluno, sem lançar', async () => {
      const f = await montar('isto-nao-e-um-jwt');

      expect(labelsDeNav(f)).toEqual(MENU_ALUNO);
      expect(textos(f, '.shell__breve-item')).toEqual(EM_BREVE_ALUNO);
    });

    it('cada item do menu tem um ícone', async () => {
      const f = await montar(tokenComPerfis(['ADMINISTRADOR']));

      for (const label of MENU_ADMINISTRADOR) {
        expect(itemDeNav(f, label).querySelector('uc-icon'), label).toBeTruthy();
      }
    });

    it('Início, Comunidades, Perfil, Denúncias e Administração são links para as suas rotas', async () => {
      const f = await montar(tokenComPerfis(['ADMINISTRADOR']));

      expect(itemDeNav(f, 'Início').getAttribute('href')).toBe('/feed');
      expect(itemDeNav(f, 'Comunidades').getAttribute('href')).toBe('/comunidades');
      expect(itemDeNav(f, 'Denúncias').getAttribute('href')).toBe('/moderacao/denuncias');
      expect(itemDeNav(f, 'Perfil').getAttribute('href')).toBe('/perfil');
      expect(itemDeNav(f, 'Administração').getAttribute('href')).toBe('/admin');
      expect(itemDeNav(f, 'Notificações').tagName).toBe('BUTTON');
    });

    it('a rota ativa recebe aria-current="page" e a classe de item ativo', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const inicio = itemDeNav(f, 'Início');
      const comunidades = itemDeNav(f, 'Comunidades');
      expect(inicio.getAttribute('aria-current')).toBeNull();

      await TestBed.inject(Router).navigateByUrl('/feed');
      f.detectChanges();

      expect(inicio.getAttribute('aria-current')).toBe('page');
      expect(inicio.classList.contains('shell__nav-item--active')).toBe(true);
      expect(comunidades.getAttribute('aria-current')).toBeNull();
    });
  });

  describe('Em breve', () => {
    it('aluno: Busca, Mensagens e Criar enquete', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));

      expect(textos(f, '.shell__breve-item')).toEqual(EM_BREVE_ALUNO);
    });

    it('moderador e administrador também veem "Solicitações de fixação"', async () => {
      for (const perfil of ['MODERADOR', 'ADMINISTRADOR']) {
        TestBed.resetTestingModule();
        const f = await montar(tokenComPerfis([perfil]));

        expect(textos(f, '.shell__breve-item')).toEqual(EM_BREVE_PRIVILEGIADO);
      }
    });

    it('item em breve é um <span aria-disabled> não focável e sem href', async () => {
      const f = await montar(tokenComPerfis(['MODERADOR']));
      const itens = [...f.nativeElement.querySelectorAll('.shell__breve-item')] as HTMLElement[];

      expect(itens.length).toBe(EM_BREVE_PRIVILEGIADO.length);
      for (const item of itens) {
        expect(item.tagName).toBe('SPAN');
        expect(item.getAttribute('aria-disabled')).toBe('true');
        expect(item.hasAttribute('href')).toBe(false);
        expect(item.tabIndex).toBeLessThan(0);
      }
    });

    it('as seções têm cabeçalho visível que nomeia a lista', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));

      expect(textos(f, '.shell__secao')).toEqual(['Suas comunidades', 'Em breve']);
      const listaBreve = f.nativeElement.querySelector('.shell__breve-lista') as HTMLElement;
      const cabecalho = f.nativeElement.querySelector(`#${listaBreve.getAttribute('aria-labelledby')}`);
      expect((cabecalho?.textContent ?? '').trim()).toBe('Em breve');
    });
  });

  describe('Suas comunidades', () => {
    it('mostra as comunidades do usuário (Epic 2)', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/comunidades/minhas`).flush(COMUNIDADES);
      f.detectChanges();

      expect(textos(f, 'a.shell__comunidade-item .shell__comunidade-nome')).toEqual([
        'Engenharia de Software',
        'Clube de Xadrez',
      ]);
      const lista = f.nativeElement.querySelector('.shell__comunidades-lista') as HTMLElement;
      const cabecalho = f.nativeElement.querySelector(`#${lista.getAttribute('aria-labelledby')}`);
      expect((cabecalho?.textContent ?? '').trim()).toBe('Suas comunidades');
    });

    it('comunidade de curso usa avatar quadrado "marca"; aberta usa a cor do id', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/comunidades/minhas`).flush(COMUNIDADES);
      f.detectChanges();

      const [curso, aberta] = [...f.nativeElement.querySelectorAll('a.shell__comunidade-item uc-avatar')] as HTMLElement[];
      expect(curso.classList).toContain('uc-avatar--marca');
      expect(curso.classList).toContain('uc-avatar--quadrado');
      expect((curso.textContent ?? '').trim()).toBe('ES');
      // corDoAvatar(2) = verde; iniciais das duas primeiras palavras, sem o conectivo "de".
      expect(aberta.classList).toContain('uc-avatar--verde');
      expect(aberta.classList).toContain('uc-avatar--quadrado');
      expect((aberta.textContent ?? '').trim()).toBe('CX');
    });

    it('a comunidade aberta fica destacada no menu, com aria-current="page" (KAN-89)', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/comunidades/minhas`).flush(COMUNIDADES);
      f.detectChanges();

      const links = [...f.nativeElement.querySelectorAll('a.shell__comunidade-item')] as HTMLAnchorElement[];
      const [engenharia, xadrez] = links;
      expect(engenharia.getAttribute('aria-current')).toBeNull();
      expect(engenharia.classList.contains('shell__comunidade-item--ativa')).toBe(false);

      await TestBed.inject(Router).navigateByUrl('/comunidades/1');
      f.detectChanges();

      expect(engenharia.getAttribute('aria-current')).toBe('page');
      expect(engenharia.classList.contains('shell__comunidade-item--ativa')).toBe(true);
      expect(xadrez.getAttribute('aria-current')).toBeNull();
      expect(xadrez.classList.contains('shell__comunidade-item--ativa')).toBe(false);
    });

    it('sem comunidades: mostra o estado vazio', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([]);
      f.detectChanges();

      const vazio = f.nativeElement.querySelector('.shell__comunidade-item--vazio');
      expect((vazio?.textContent ?? '').trim()).toBe('Você ainda não faz parte de nenhuma');
    });
  });

  describe('cartão da conta', () => {
    it('sem nome carregado: mostra só o papel, e a inicial do papel no avatar', async () => {
      const f = await montar(tokenComPerfis(['MODERADOR']));

      const cartao = cartaoConta(f);
      expect(cartao.querySelector('.shell__conta-nome')).toBeNull();
      expect((cartao.querySelector('.shell__conta-papel')?.textContent ?? '').trim()).toBe('Moderador');
      expect((cartao.querySelector('uc-avatar')?.textContent ?? '').trim()).toBe('M');
      expect(cartao.querySelector('uc-avatar')?.classList).toContain('uc-avatar--circulo');
    });

    it('com o nome de GET /usuarios/me: nome, papel e iniciais', async () => {
      const f = await montar(tokenComPerfis(['ALUNO'], '6'));
      TestBed.inject(HttpTestingController)
        .expectOne(`${API_BASE_URL}/usuarios/me`)
        .flush({ id: 6, nome: 'Rafael Souza', email: 'r@x', perfil: 'ALUNO', curso: null });
      f.detectChanges();

      const cartao = cartaoConta(f);
      expect((cartao.querySelector('.shell__conta-nome')?.textContent ?? '').trim()).toBe('Rafael Souza');
      expect((cartao.querySelector('.shell__conta-papel')?.textContent ?? '').trim()).toBe('Aluno');
      expect((cartao.querySelector('uc-avatar')?.textContent ?? '').trim()).toBe('RS');
      expect(cartao.querySelector('uc-avatar')?.classList).toContain('uc-avatar--verde');
    });

    it('falha ao buscar o nome: continua só com o papel, sem lançar', async () => {
      const f = await montar(tokenComPerfis(['ADMINISTRADOR']));
      TestBed.inject(HttpTestingController)
        .expectOne(`${API_BASE_URL}/usuarios/me`)
        .flush(null, { status: 500, statusText: 'Erro' });
      f.detectChanges();

      expect((cartaoConta(f).querySelector('.shell__conta-papel')?.textContent ?? '').trim()).toBe('Administrador');
      expect(cartaoConta(f).querySelector('.shell__conta-nome')).toBeNull();
    });

    it('fica dentro da <nav>, com o ícone "dots"', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));

      expect(cartaoConta(f).closest('nav.shell__sidebar')).toBeTruthy();
      expect(cartaoConta(f).querySelector('uc-icon')).toBeTruthy();
    });

    it('expõe Perfil, Configurações e Sair', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      abrirMenu(f);

      expect(itensDoMenu(f).map((b) => (b.textContent ?? '').trim())).toEqual(['Perfil', 'Configurações', 'Sair']);
    });

    it('abre para cima', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));

      expect(f.nativeElement.querySelector('#shell-menu-conta')?.classList).toContain('uc-menu--acima');
    });

    it('clicar no cartão abre o menu e marca aria-expanded="true"', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const botao = cartaoConta(f);

      expect(botao.getAttribute('aria-expanded')).toBe('false');
      expect(botao.getAttribute('aria-haspopup')).toBe('menu');
      expect(painelDaConta(f)).toBeNull();

      abrirMenu(f);

      expect(botao.getAttribute('aria-expanded')).toBe('true');
      expect(painelDaConta(f)).toBeTruthy();
    });

    it('o menu tem id + aria-label e o cartão aponta para ele via aria-controls', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      abrirMenu(f);

      expect(painelDaConta(f)?.getAttribute('aria-label')).toBe('Conta');
      expect(cartaoConta(f).getAttribute('aria-controls')).toBe('shell-menu-conta');
    });

    it('Escape fecha o menu e devolve o foco ao cartão', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      abrirMenu(f);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      f.detectChanges();

      expect(cartaoConta(f).getAttribute('aria-expanded')).toBe('false');
      expect(painelDaConta(f)).toBeNull();
      expect(document.activeElement).toBe(cartaoConta(f));
    });

    it('clique fora fecha o menu', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      abrirMenu(f);

      document.body.click();
      f.detectChanges();

      expect(cartaoConta(f).getAttribute('aria-expanded')).toBe('false');
      expect(painelDaConta(f)).toBeNull();
    });

    it('Tab para fora do menu (foco sai do painel) fecha sem devolver o foco ao cartão', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      abrirMenu(f);

      const sair = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === 'Sair')!;
      sair.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }));
      f.detectChanges();

      expect(cartaoConta(f).getAttribute('aria-expanded')).toBe('false');
      expect(painelDaConta(f)).toBeNull();
      expect(document.activeElement).not.toBe(cartaoConta(f));
    });

    it('foco movendo entre itens do próprio menu não o fecha', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      abrirMenu(f);

      const [perfil, , sair] = itensDoMenu(f);
      perfil.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: sair }));
      f.detectChanges();

      expect(cartaoConta(f).getAttribute('aria-expanded')).toBe('true');
      expect(painelDaConta(f)).toBeTruthy();
    });

    it('Perfil fecha o menu e navega para /perfil (Stories 4.1/4.2)', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      abrirMenu(f);

      const perfil = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === 'Perfil')!;
      expect(perfil.getAttribute('aria-disabled')).toBeNull();
      perfil.click();
      f.detectChanges();

      expect(cartaoConta(f).getAttribute('aria-expanded')).toBe('false');
      expect(navegar).toHaveBeenCalledWith('/perfil');
    });

    it('Configurações é aria-disabled e não faz nada ao ser ativado', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const router = TestBed.inject(Router);
      const navegar = vi.spyOn(router, 'navigateByUrl');
      const urlAntes = router.url;
      abrirMenu(f);

      const configuracoes = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === 'Configurações')!;
      expect(configuracoes.getAttribute('aria-disabled')).toBe('true');
      configuracoes.click();
      f.detectChanges();

      expect(router.url).toBe(urlAntes);
      expect(navegar).not.toHaveBeenCalled();
    });

    it('Sair chama AuthService.logout() e navega para /login', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const logoutSpy = vi.spyOn(TestBed.inject(AuthService), 'logout').mockImplementation(() => undefined);
      const navSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      abrirMenu(f);
      const sair = itensDoMenu(f).find((b) => (b.textContent ?? '').trim() === 'Sair')!;
      sair.click();
      f.detectChanges();

      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(navSpy).toHaveBeenCalledWith('/login');
      expect(cartaoConta(f).getAttribute('aria-expanded')).toBe('false');
    });

    it('abrir o cartão da conta fecha o painel de notificações', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      (itemDeNav(f, 'Notificações') as HTMLButtonElement).click();
      f.detectChanges();
      expect(f.nativeElement.querySelector('#shell-notificacoes')).toBeTruthy();

      abrirMenu(f);

      expect(f.nativeElement.querySelector('#shell-notificacoes')).toBeNull();
      expect(painelDaConta(f)).toBeTruthy();
    });
  });

  describe('barra superior do celular (interina até a Task 14)', () => {
    function avatarBtn(f: ComponentFixture<Shell>): HTMLButtonElement {
      return f.nativeElement.querySelector('.shell__topbar .shell__avatar') as HTMLButtonElement;
    }

    it('continua no DOM com o avatar e o seu próprio menu (#shell-menu)', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));

      avatarBtn(f).click();
      f.detectChanges();

      const menu = f.nativeElement.querySelector('#shell-menu') as HTMLElement;
      expect(menu.getAttribute('aria-label')).toBe('Conta');
      expect(avatarBtn(f).getAttribute('aria-controls')).toBe('shell-menu');
      expect([...menu.querySelectorAll('[role="menuitem"]')].map((b) => (b.textContent ?? '').trim())).toEqual([
        'Perfil',
        'Configurações',
        'Sair',
      ]);
    });

    it('Sair pelo menu do celular chama logout() e navega para /login', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const logoutSpy = vi.spyOn(TestBed.inject(AuthService), 'logout').mockImplementation(() => undefined);
      const navSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      avatarBtn(f).click();
      f.detectChanges();
      const sair = [...f.nativeElement.querySelectorAll('#shell-menu [role="menuitem"]')].find(
        (b) => (b.textContent ?? '').trim() === 'Sair',
      ) as HTMLButtonElement;
      sair.click();
      f.detectChanges();

      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(navSpy).toHaveBeenCalledWith('/login');
    });
  });

  describe('modo largo', () => {
    it('liga em rota com data.largo (/comunidades) e desliga em /feed', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const router = TestBed.inject(Router);

      await router.navigateByUrl('/comunidades');
      f.detectChanges();
      expect(f.nativeElement.classList).toContain('shell--larga');

      await router.navigateByUrl('/feed');
      f.detectChanges();
      expect(f.nativeElement.classList).not.toContain('shell--larga');
    });

    it('app.routes marca como largas só comunidades, admin, admin/cursos, admin/usuarios e moderacao/denuncias', () => {
      const casca = rotasDoApp.find((r) => r.children)!;
      const largas = casca.children!.filter((r) => r.data?.['largo'] === true).map((r) => r.path);

      expect(largas.sort()).toEqual(
        ['admin', 'admin/cursos', 'admin/usuarios', 'comunidades', 'moderacao/denuncias'].sort(),
      );
    });
  });

  describe('coluna lateral', () => {
    it('sem template registrado não existe <aside>', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));

      expect(f.nativeElement.querySelector('aside')).toBeNull();
    });

    it('template registrado no ShellLateralService aparece dentro de <aside aria-label="Complementar">', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const host = TestBed.createComponent(HostLateral);
      host.detectChanges();
      const lateral = TestBed.inject(ShellLateralService);

      lateral.definir(host.componentInstance.lateral());
      f.detectChanges();

      const aside = f.nativeElement.querySelector('aside') as HTMLElement;
      expect(aside.getAttribute('aria-label')).toBe('Complementar');
      expect(aside.querySelector('.conteudo-lateral')?.textContent).toBe('Agenda da semana');

      lateral.definir(null);
      f.detectChanges();
      expect(f.nativeElement.querySelector('aside')).toBeNull();
    });

    it('a sidebar é um landmark <nav> com rótulo (não dentro de <aside>)', async () => {
      const f = await montar(tokenComPerfis(['ALUNO']));
      const nav = f.nativeElement.querySelector('nav.shell__sidebar') as HTMLElement;

      expect(nav).toBeTruthy();
      expect(nav.getAttribute('aria-label')).toBeTruthy();
      expect(nav.closest('aside')).toBeNull();
    });
  });

  describe('Denúncias (Epic 12)', () => {
    it('moderador: "Denúncias" leva à fila e mostra o contador de pendentes', async () => {
      const f = await montar(tokenComPerfis(['MODERADOR']));
      const httpMock = TestBed.inject(HttpTestingController);

      const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/moderacao/denuncias`);
      expect(req.request.params.get('situacao')).toBe('PENDENTE');
      req.flush({ content: [], page: 0, size: 1, totalElements: 3, totalPages: 3 });
      f.detectChanges();

      const link = itemDeNav(f, 'Denúncias');
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

      expect(itemDeNav(f, 'Denúncias').querySelector('.contador')).toBeNull();
    });

    it('aluno: não busca a fila de denúncias', async () => {
      await montar(tokenComPerfis(['ALUNO']));

      TestBed.inject(HttpTestingController).expectNone((r) => r.url === `${API_BASE_URL}/moderacao/denuncias`);
    });
  });
});

describe('Shell - gaveta de navegação mobile (Story 14.4)', () => {
  let fixture: ComponentFixture<Shell> | undefined;

  async function montar(): Promise<ComponentFixture<Shell>> {
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

  function botaoNav(f: ComponentFixture<Shell>): HTMLButtonElement {
    return f.nativeElement.querySelector('.shell__menu-toggle') as HTMLButtonElement;
  }

  function sidebarNav(f: ComponentFixture<Shell>): HTMLElement {
    return f.nativeElement.querySelector('.shell__sidebar') as HTMLElement;
  }

  function abrirNav(f: ComponentFixture<Shell>): void {
    botaoNav(f).click();
    f.detectChanges();
  }

  afterEach(() => {
    fixture?.nativeElement.remove();
    fixture = undefined;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('o botão Menu começa fechado, com aria-controls apontando para a sidebar', async () => {
    const f = await montar();
    const botao = botaoNav(f);

    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(botao.getAttribute('aria-controls')).toBe('shell-sidebar-nav');
    expect(sidebarNav(f).id).toBe('shell-sidebar-nav');
    expect(sidebarNav(f).classList.contains('shell__sidebar--aberta')).toBe(false);
  });

  it('clicar no botão Menu abre a gaveta e marca aria-expanded="true"', async () => {
    const f = await montar();

    abrirNav(f);

    expect(botaoNav(f).getAttribute('aria-expanded')).toBe('true');
    expect(sidebarNav(f).classList.contains('shell__sidebar--aberta')).toBe(true);
  });

  it('clicar de novo fecha a gaveta', async () => {
    const f = await montar();
    abrirNav(f);

    abrirNav(f);

    expect(botaoNav(f).getAttribute('aria-expanded')).toBe('false');
    expect(sidebarNav(f).classList.contains('shell__sidebar--aberta')).toBe(false);
  });

  it('Escape fecha a gaveta e devolve o foco ao botão Menu', async () => {
    const f = await montar();
    abrirNav(f);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    f.detectChanges();

    expect(botaoNav(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(botaoNav(f));
  });

  it('clique fora fecha a gaveta e devolve o foco ao botão Menu', async () => {
    const f = await montar();
    abrirNav(f);

    document.body.click();
    f.detectChanges();

    expect(botaoNav(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(botaoNav(f));
  });

  it('escolher um item de navegação fecha a gaveta e navega', async () => {
    const f = await montar();
    abrirNav(f);

    const inicio = [...f.nativeElement.querySelectorAll('a.shell__nav-item')].find(
      (el) => (el.textContent ?? '').trim() === 'Início',
    ) as HTMLAnchorElement;
    inicio.click();
    f.detectChanges();

    expect(botaoNav(f).getAttribute('aria-expanded')).toBe('false');
    expect(sidebarNav(f).classList.contains('shell__sidebar--aberta')).toBe(false);
  });

  it('abrir a gaveta fecha o dropdown de conta e o painel de notificações', async () => {
    const f = await montar();
    (f.nativeElement.querySelector('.shell__avatar') as HTMLButtonElement).click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('#shell-menu')).toBeTruthy();

    abrirNav(f);

    expect(f.nativeElement.querySelector('#shell-menu')).toBeNull();
    expect(botaoNav(f).getAttribute('aria-expanded')).toBe('true');
  });

  it('abrir o dropdown de conta fecha a gaveta', async () => {
    const f = await montar();
    abrirNav(f);

    (f.nativeElement.querySelector('.shell__avatar') as HTMLButtonElement).click();
    f.detectChanges();

    expect(botaoNav(f).getAttribute('aria-expanded')).toBe('false');
    expect(f.nativeElement.querySelector('#shell-menu')).toBeTruthy();
  });

  it('Tab no último item focável da gaveta volta para o primeiro (foco preso)', async () => {
    const f = await montar();
    abrirNav(f);

    const focaveis = [...sidebarNav(f).querySelectorAll('a, button')] as HTMLElement[];
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    ultimo.focus();

    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(evento, 'preventDefault');
    sidebarNav(f).dispatchEvent(evento);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(primeiro);
  });

  it('Shift+Tab no primeiro item focável da gaveta vai para o último (foco preso)', async () => {
    const f = await montar();
    abrirNav(f);

    const focaveis = [...sidebarNav(f).querySelectorAll('a, button')] as HTMLElement[];
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    primeiro.focus();

    const evento = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefault = vi.spyOn(evento, 'preventDefault');
    sidebarNav(f).dispatchEvent(evento);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(ultimo);
  });

  it('Tab dentro da gaveta fechada não prende o foco (nada a fazer)', async () => {
    const f = await montar();

    const focaveis = [...sidebarNav(f).querySelectorAll('a, button')] as HTMLElement[];
    const ultimo = focaveis[focaveis.length - 1];
    ultimo.focus();

    const evento = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    const preventDefault = vi.spyOn(evento, 'preventDefault');
    sidebarNav(f).dispatchEvent(evento);

    expect(preventDefault).not.toHaveBeenCalled();
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

  /** Corpo (sem as chaves) de cada bloco que abre logo depois de `cabecalho`. */
  function blocos(fonte: string, cabecalho: string): string[] {
    const out: string[] = [];
    let de = fonte.indexOf(cabecalho);
    while (de >= 0) {
      const abre = fonte.indexOf('{', de);
      let nivel = 0;
      let i = abre;
      for (; i < fonte.length; i++) {
        if (fonte[i] === '{') nivel++;
        else if (fonte[i] === '}' && --nivel === 0) break;
      }
      out.push(fonte.slice(abre + 1, i));
      de = fonte.indexOf(cabecalho, i);
    }
    return out;
  }

  /** Regras de primeiro nível (fora de qualquer @media). */
  const semMedia = (() => {
    let texto = semComentarios;
    for (const cabecalho of ['@media', '@keyframes']) {
      for (const corpo of blocos(texto, cabecalho)) texto = texto.replace(corpo, '');
    }
    return texto;
  })();

  /** Declarações de `seletor` (match exato do seletor antes da chave) dentro de `fonte`. */
  function regra(fonte: string, seletor: string): string {
    const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp(`(?:^|[}\\s,])${escapado}\\s*\\{([^}]*)\\}`, 'm').exec(fonte);
    return m ? m[1] : '';
  }

  const tablet = blocos(semComentarios, '@media (max-width: bp.$uc-bp-tablet)').join('\n');
  const celular = blocos(semComentarios, '@media (max-width: bp.$uc-bp-mobile)').join('\n');

  it('três colunas centradas: menu, conteúdo e lateral pelos tokens --uc-layout-*', () => {
    const host = regra(semMedia, ':host');
    expect(host).toMatch(
      /grid-template-columns:\s*var\(--uc-layout-nav\)\s+minmax\(0,\s*var\(--uc-layout-feed\)\)\s+var\(--uc-layout-aside\)/,
    );
    expect(host).toMatch(/justify-content:\s*center/);
    expect(host).toMatch(/column-gap:\s*var\(--uc-layout-gap\)/);
    expect(host).toMatch(/padding:\s*0\s+var\(--uc-space-page-margin\)/);
  });

  it('modo largo: menu + var(--uc-layout-wide), sem coluna lateral', () => {
    expect(regra(semMedia, ':host(.shell--larga)')).toMatch(
      /grid-template-columns:\s*var\(--uc-layout-nav\)\s+minmax\(0,\s*var\(--uc-layout-wide\)\)\s*;/,
    );
  });

  it('coluna de conteúdo com filete de 1px dos dois lados; no modo largo só à esquerda', () => {
    const main = regra(semMedia, '.shell__main');
    expect(main).toMatch(/border-left:\s*1px solid var\(--uc-color-border\)/);
    expect(main).toMatch(/border-right:\s*1px solid var\(--uc-color-border\)/);
    expect(regra(semMedia, ':host(.shell--larga) .shell__main')).toMatch(/border-right:\s*0/);
  });

  it('menu fica fixo (sticky) com a altura da janela', () => {
    const nav = regra(semMedia, '.shell__sidebar');
    expect(nav).toMatch(/position:\s*sticky/);
    expect(nav).toMatch(/height:\s*100dvh/);
  });

  it(`até $uc-bp-tablet a coluna lateral some e o grid fica com duas colunas`, () => {
    expect(regra(tablet, '.shell__lateral')).toMatch(/display:\s*none/);
    expect(regra(tablet, ':host')).toMatch(/grid-template-columns:\s*var\(--uc-layout-nav\)\s+minmax\(0,\s*var\(--uc-layout-feed\)\)\s*;/);
  });

  it('a gaveta (overlay fixo) e a barra superior só existem até $uc-bp-mobile', () => {
    expect(regra(celular, '.shell__sidebar')).toMatch(/position:\s*fixed/);
    expect(regra(semMedia, '.shell__topbar')).toMatch(/display:\s*none/);
    expect(regra(celular, '.shell__topbar')).toMatch(/display:\s*flex/);
  });

  it('item ativo: tinta forte e negrito, sem fundo', () => {
    const ativo = regra(semMedia, '.shell__nav-item--active');
    expect(ativo).toMatch(/color:\s*var\(--uc-color-ink\)/);
    expect(ativo).toMatch(/font-weight:\s*var\(--uc-font-weight-bold\)/);
    expect(ativo).not.toMatch(/background/);
  });

  it('hover dos itens clicáveis só pinta o fundo surface-muted, sem mudar peso nem cor', () => {
    for (const seletor of [
      '.shell__nav-item:hover',
      '.shell__comunidade-item:hover',
      '.shell__conta:hover',
      '.shell__notificacao-item:hover',
      '.shell__menu-item:hover',
    ]) {
      const m = new RegExp(`${seletor.replace(/[.]/g, '\\.')}\\s*[,{]`).exec(semMedia);
      expect(m, seletor).toBeTruthy();
      // Corpo da regra que contém o seletor (até a primeira chave de fechamento).
      const corpo = semMedia.slice(semMedia.indexOf('{', m!.index) + 1, semMedia.indexOf('}', m!.index));
      expect(corpo, seletor).toMatch(/background:\s*var\(--uc-color-surface-muted\)/);
      expect(corpo, seletor).not.toMatch(/font-weight|(?:^|[^-])color:/);
    }
  });

  it('o dropdown interino do celular mantém o corpo de texto (font-size body)', () => {
    // Junta todas as regras que terminam em `.shell__menu-item {` (a última vence na cascata).
    const corpos = [...semMedia.matchAll(/\.shell__menu-item\s*\{([^}]*)\}/g)].map((m) => m[1]);
    const tamanhos = corpos.flatMap((c) => [...c.matchAll(/font-size:\s*([^;]+);/g)].map((m) => m[1].trim()));
    expect(tamanhos.at(-1)).toBe('var(--uc-font-size-body)');
  });

  // O "sem laranja" já é travado para todo src/app por src/styles/tokens.spec.ts
  // (consumidores de src/app); repetir a palavra aqui faria este spec ser ofensor.
  it('sem o breakpoint legado $uc-breakpoint-nav', () => {
    expect(scss).not.toMatch(/uc-breakpoint-nav/);
    const breakpoints = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../../styles/_breakpoints.scss'),
      'utf8',
    );
    expect(breakpoints).not.toMatch(/uc-breakpoint-nav/);
  });
});
