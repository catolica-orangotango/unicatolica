import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { NotificacoesService } from './notificacoes.service';

const NOTIFICACAO = {
  id: 1,
  tipo: 'ONBOARDING_PERFIL',
  texto: 'Complete seu perfil',
  link: '/perfil',
  lida: false,
  criadoEm: '2026-10-27T00:00:00Z',
};

describe('NotificacoesService', () => {
  let service: NotificacoesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('pacext.token', 'token-fake');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificacoesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('carregar busca a 1ª página por padrão e preenche a cache compartilhada', () => {
    service.carregar().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`);
    expect(req.request.params.get('pagina')).toBe('0');
    expect(req.request.params.get('tamanho')).toBe('20');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    req.flush({ content: [NOTIFICACAO], page: 0, size: 20, totalElements: 1, totalPages: 1 });

    expect(service.notificacoes()).toEqual([NOTIFICACAO]);
    expect(service.naoLidas()).toBe(1);
  });

  it('marcarComoLida atualiza a cache local otimisticamente', () => {
    service.carregar().subscribe();
    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`)
      .flush({ content: [NOTIFICACAO], page: 0, size: 20, totalElements: 1, totalPages: 1 });

    service.marcarComoLida(1).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/notificacoes/1/lida`);
    expect(req.request.method).toBe('POST');
    req.flush(null);

    expect(service.notificacoes()[0].lida).toBe(true);
    expect(service.naoLidas()).toBe(0);
  });

  it('excluir chama o DELETE e tira o item da cache compartilhada (KAN-46)', () => {
    service.carregar().subscribe();
    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`)
      .flush({ content: [NOTIFICACAO], page: 0, size: 20, totalElements: 1, totalPages: 1 });

    service.excluir(1).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/notificacoes/1`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    req.flush(null);

    expect(service.notificacoes()).toEqual([]);
  });

  it('listarPagina busca a página pedida sem tocar na cache compartilhada (KAN-46)', () => {
    service.carregar().subscribe();
    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`)
      .flush({ content: [NOTIFICACAO], page: 0, size: 20, totalElements: 21, totalPages: 2 });

    const outraNotificacao = { ...NOTIFICACAO, id: 2, texto: 'Outra notificação' };
    service.listarPagina(1, 20).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`);
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ content: [outraNotificacao], page: 1, size: 20, totalElements: 21, totalPages: 2 });

    // A cache do painel (usada pelo shell) continua com a página 0, intocada.
    expect(service.notificacoes()).toEqual([NOTIFICACAO]);
  });
});
