import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { Notificacao } from '../notificacoes.service';
import { NotificacoesLista } from './notificacoes-lista';

const URL = `${API_BASE_URL}/notificacoes/me`;

function notificacao(id: number, overrides: Partial<Notificacao> = {}): Notificacao {
  return {
    id,
    tipo: 'ONBOARDING_PERFIL',
    texto: `Notificação ${id}`,
    link: '/perfil',
    lida: false,
    criadoEm: '2026-10-27T00:00:00Z',
    ...overrides,
  };
}

function pagina(content: Notificacao[], totalPages = 1) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages };
}

describe('NotificacoesLista', () => {
  let fixture: ComponentFixture<NotificacoesLista>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;
  let toasts: string[];

  async function montar(): Promise<void> {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [NotificacoesLista],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NotificacoesLista);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  function flushPrimeiraPagina(content: Notificacao[], totalPages = 1): void {
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('pagina') === '0')
      .flush(pagina(content, totalPages));
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('mostra "Carregando…" e depois a lista', async () => {
    await montar();
    expect(el.textContent).toContain('Carregando');

    flushPrimeiraPagina([notificacao(1), notificacao(2)]);

    expect(el.querySelectorAll('.lista__item')).toHaveLength(2);
  });

  it('sem notificações mostra o estado vazio', async () => {
    await montar();
    flushPrimeiraPagina([]);

    expect(el.textContent).toContain('Você não tem notificações.');
  });

  it('erro ao carregar mostra mensagem amigável', async () => {
    await montar();
    httpMock.expectOne((r) => r.url === URL).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar suas notificações',
    );
  });

  it('clicar no texto marca como lida e navega pro link', async () => {
    await montar();
    flushPrimeiraPagina([notificacao(1)]);
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    (el.querySelector('.lista__texto') as HTMLButtonElement).click();

    httpMock.expectOne(`${API_BASE_URL}/notificacoes/1/lida`).flush(null);
    fixture.detectChanges();

    expect(navegar).toHaveBeenCalledWith('/perfil');
    expect(el.querySelector('.lista__item')?.classList.contains('lista__item--nao-lida')).toBe(false);
  });

  it('"Marcar como lida" some depois de marcar; não aparece pra quem já está lida', async () => {
    await montar();
    flushPrimeiraPagina([notificacao(1), notificacao(2, { lida: true })]);

    const botoes = [...el.querySelectorAll('.lista__botao-secundario')];
    expect(botoes).toHaveLength(1);

    (botoes[0] as HTMLButtonElement).click();
    httpMock.expectOne(`${API_BASE_URL}/notificacoes/1/lida`).flush(null);
    fixture.detectChanges();

    expect(el.querySelectorAll('.lista__botao-secundario')).toHaveLength(0);
  });

  it('excluir chama o DELETE e tira o item da lista', async () => {
    await montar();
    flushPrimeiraPagina([notificacao(1), notificacao(2)]);

    const excluir = [...el.querySelectorAll('.lista__botao-perigo')][0] as HTMLButtonElement;
    excluir.click();

    httpMock.expectOne(`${API_BASE_URL}/notificacoes/1`).flush(null);
    fixture.detectChanges();

    expect(el.querySelectorAll('.lista__item')).toHaveLength(1);
    expect(el.textContent).toContain('Notificação 2');
    expect(el.textContent).not.toContain('Notificação 1');
  });

  it('erro ao excluir mostra mensagem e mantém o item', async () => {
    await montar();
    flushPrimeiraPagina([notificacao(1)]);

    (el.querySelector('.lista__botao-perigo') as HTMLButtonElement).click();
    httpMock.expectOne(`${API_BASE_URL}/notificacoes/1`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelectorAll('.lista__item')).toHaveLength(1);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível concluir a ação');
  });

  it('"Carregar mais" busca a próxima página e acrescenta à lista', async () => {
    await montar();
    flushPrimeiraPagina([notificacao(1)], 2);

    (el.querySelector('.lista__carregar-mais') as HTMLButtonElement).click();

    httpMock
      .expectOne((r) => r.url === URL && r.params.get('pagina') === '1')
      .flush(pagina([notificacao(2)], 2));
    fixture.detectChanges();

    expect(el.querySelectorAll('.lista__item')).toHaveLength(2);
    expect(el.querySelector('.lista__carregar-mais')).toBeNull();
  });

  it('erro ao "Carregar mais" mostra um toast e mantém a lista e o botão', async () => {
    await montar();
    flushPrimeiraPagina([notificacao(1)], 2);

    (el.querySelector('.lista__carregar-mais') as HTMLButtonElement).click();
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('pagina') === '1')
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(toasts).toEqual(['Não foi possível carregar mais notificações agora.']);
    expect(el.querySelectorAll('.lista__item')).toHaveLength(1);
    expect(el.querySelector('.lista__carregar-mais')).toBeTruthy();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('notificação sem link não é clicável, mas ainda pode ser marcada/excluída', async () => {
    await montar();
    flushPrimeiraPagina([notificacao(1, { link: null })]);

    expect(el.querySelector('.lista__texto--inerte')?.textContent?.trim()).toBe('Notificação 1');
    expect(el.querySelector('button.lista__texto')).toBeNull();
    expect(el.querySelector('.lista__botao-secundario')).toBeTruthy();
    expect(el.querySelector('.lista__botao-perigo')).toBeTruthy();
  });
});
