import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('pacext.token', 'token-fake');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuditoriaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('lista sem filtro: só página e tamanho 20, com o header Authorization', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/admin/auditoria`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    expect(req.request.params.keys().sort()).toEqual(['pagina', 'tamanho']);
    expect(req.request.params.get('pagina')).toBe('0');
    expect(req.request.params.get('tamanho')).toBe('20');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('manda só os filtros preenchidos e a página pedida', () => {
    service
      .listar({ modulo: 'identidade', acao: '', detalhes: 'MODERADOR', de: '2026-03-01', ate: '2026-03-09', pagina: 2 })
      .subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/admin/auditoria`);
    expect(req.request.params.get('modulo')).toBe('identidade');
    expect(req.request.params.get('detalhes')).toBe('MODERADOR');
    expect(req.request.params.get('de')).toBe('2026-03-01');
    expect(req.request.params.get('ate')).toBe('2026-03-09');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.has('acao')).toBe(false);
    expect(req.request.params.has('entidadeAfetada')).toBe(false);
    req.flush({ content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('busca as opções dos filtros com o header Authorization', () => {
    let recebido: unknown;
    service.filtros().subscribe((f) => (recebido = f));

    const req = httpMock.expectOne(`${API_BASE_URL}/admin/auditoria/filtros`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    const corpo = { modulos: ['identidade'], acoesPorModulo: { identidade: ['LOGIN'] }, entidadesAfetadas: ['Usuario'] };
    req.flush(corpo);
    expect(recebido).toEqual(corpo);
  });
});
