import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { ModeracaoService } from './moderacao.service';

describe('ModeracaoService', () => {
  let service: ModeracaoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('pacext.token', 'token-fake');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ModeracaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('denuncia uma postagem com o corpo do contrato e o Bearer', () => {
    service.denunciar(7, 'spam').subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/denuncias`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tipoConteudo: 'PUBLICACAO', conteudoId: 7, motivo: 'spam' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    req.flush({ id: 1, criadoEm: '2026-10-01T00:00:00Z' });
  });

  it('lista pela situação e, nos pendentes, atualiza o contador', () => {
    service.listar('PENDENTE', 2, 10).subscribe();

    const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/moderacao/denuncias`);
    expect(req.request.params.get('situacao')).toBe('PENDENTE');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamanho')).toBe('10');
    req.flush({ content: [], page: 2, size: 10, totalElements: 4, totalPages: 1 });

    expect(service.pendentes()).toBe(4);
  });

  it('listar resolvidas não mexe no contador de pendentes', () => {
    service.listar('RESOLVIDA').subscribe();

    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/moderacao/denuncias`)
      .flush({ content: [], page: 0, size: 20, totalElements: 9, totalPages: 1 });

    expect(service.pendentes()).toBeNull();
  });

  it('atualizarPendentes busca uma página de 1 e engole erro', () => {
    service.atualizarPendentes();

    const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/moderacao/denuncias`);
    expect(req.request.params.get('tamanho')).toBe('1');
    req.flush({ error: { code: 'ACESSO_NEGADO', message: 'x' } }, { status: 403, statusText: 'Forbidden' });

    expect(service.pendentes()).toBeNull();
  });

  it('ocultar, restaurar e descartar chamam as rotas de ação', () => {
    service.ocultar(3, 'ofensivo').subscribe();
    service.restaurar(3).subscribe();
    service.descartar(3).subscribe();
    service.descartar(4, 'improcedente').subscribe();

    expect(httpMock.expectOne(`${API_BASE_URL}/moderacao/denuncias/3/ocultacao`).request.body).toEqual({
      motivo: 'ofensivo',
    });
    expect(httpMock.expectOne(`${API_BASE_URL}/moderacao/denuncias/3/restauracao`).request.body).toBeNull();
    expect(httpMock.expectOne(`${API_BASE_URL}/moderacao/denuncias/3/descarte`).request.body).toEqual({});
    expect(httpMock.expectOne(`${API_BASE_URL}/moderacao/denuncias/4/descarte`).request.body).toEqual({
      motivo: 'improcedente',
    });
  });
});
