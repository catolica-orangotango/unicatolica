import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import type { Notificacao } from '../notificacoes.service';
import { NotificacoesLista } from './notificacoes-lista';

const URL_LISTA = `${API_BASE_URL}/notificacoes/me`;

function notificacao(parcial: Partial<Notificacao> & Pick<Notificacao, 'id'>): Notificacao {
  return {
    tipo: 'ONBOARDING_PERFIL',
    texto: 'Complete seu perfil',
    link: '/perfil',
    lida: false,
    criadoEm: '2026-01-01T00:00:00Z',
    ...parcial,
  };
}

function pagina(content: Notificacao[], extra: Partial<{ page: number; totalPages: number; totalElements: number; totalNaoLidas: number }> = {}) {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    totalNaoLidas: content.filter((n) => !n.lida).length,
    ...extra,
  };
}

describe('NotificacoesLista', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let html: HTMLElement;
  let harness: RouterTestingHarness;

  const ehLista = (r: { url: string }) => r.url === URL_LISTA;

  async function abrir(url = '/notificacoes'): Promise<void> {
    localStorage.setItem('pacext.token', 'token-fake');
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'notificacoes', component: NotificacoesLista }]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, NotificacoesLista);
    html = harness.routeNativeElement as HTMLElement;
  }

  function responder(conteudo: Notificacao[], extra: Parameters<typeof pagina>[1] = {}) {
    const req = httpMock.expectOne(ehLista);
    req.flush(pagina(conteudo, extra));
    harness.detectChanges();
    return req;
  }

  function botao(texto: string): HTMLButtonElement {
    const encontrado = [...html.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === texto);
    if (!encontrado) throw new Error(`Botão não encontrado: ${texto}`);
    return encontrado as HTMLButtonElement;
  }

  afterEach(() => {
    localStorage.clear();
  });

  it('mostra o esqueleto de carregamento e depois a lista, mais recente com data relativa', async () => {
    await abrir();
    expect(html.querySelector('[aria-label="Carregando notificações"]')).toBeTruthy();

    responder([notificacao({ id: 1, texto: 'Complete seu perfil', criadoEm: new Date().toISOString() })]);

    expect(html.querySelector('[aria-label="Carregando notificações"]')).toBeNull();
    expect(html.textContent).toContain('Complete seu perfil');
    expect(html.querySelector('time')?.textContent?.trim()).toBe('agora');
  });

  it('sem notificações mostra o estado vazio', async () => {
    await abrir();
    responder([]);

    expect(html.textContent).toContain('Sem notificações por enquanto.');
  });

  it('erro de rede mostra "Tentar de novo", que refaz a consulta', async () => {
    await abrir();
    httpMock.expectOne(ehLista).flush(null, { status: 500, statusText: 'Erro' });

    expect(html.textContent).toContain('Não foi possível carregar as notificações agora.');

    botao('Tentar de novo').click();
    responder([notificacao({ id: 1 })]);

    expect(html.textContent).toContain('Complete seu perfil');
  });

  it('paginação: próxima navega para ?pagina=2 e manda pagina=1 pro backend', async () => {
    await abrir();
    responder([notificacao({ id: 1 })], { totalPages: 3, totalElements: 50 });
    expect(html.querySelector('.lista__paginacao')?.textContent).toContain('Página 1 de 3');

    botao('Próxima →').click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/notificacoes?pagina=2');
    const req = responder([notificacao({ id: 2 })], { page: 1, totalPages: 3, totalElements: 50 });
    expect(req.request.params.get('pagina')).toBe('1');
    expect(html.querySelector('.lista__paginacao')?.textContent).toContain('Página 2 de 3');
  });

  it('"Marcar todas como lidas" só aparece com não lida e some depois do clique', async () => {
    await abrir();
    responder([notificacao({ id: 1, lida: false })]);
    expect(html.textContent).toContain('Marcar todas como lidas');

    botao('Marcar todas como lidas').click();
    httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/lidas`).flush(null);
    responder([notificacao({ id: 1, lida: true })]);

    expect(html.textContent).not.toContain('Marcar todas como lidas');
  });

  it('excluir chama o DELETE e recarrega a página atual (RF84.3)', async () => {
    await abrir();
    responder([notificacao({ id: 9, texto: 'Complete seu perfil' })]);

    (html.querySelector('[aria-label="Excluir notificação: Complete seu perfil"]') as HTMLButtonElement).click();
    httpMock.expectOne(`${API_BASE_URL}/notificacoes/9`).flush(null);
    responder([]);

    expect(html.textContent).toContain('Sem notificações por enquanto.');
  });

  it('excluir o único item de uma página > 1 volta para a página anterior', async () => {
    await abrir('/notificacoes?pagina=2');
    responder([notificacao({ id: 9 })], { page: 1, totalPages: 2, totalElements: 21 });

    (html.querySelector('.lista__excluir') as HTMLButtonElement).click();
    httpMock.expectOne(`${API_BASE_URL}/notificacoes/9`).flush(null);
    await harness.fixture.whenStable();

    expect(router.url).toBe('/notificacoes');
    responder([notificacao({ id: 1 })], { page: 0, totalPages: 1, totalElements: 20 });
  });
});
