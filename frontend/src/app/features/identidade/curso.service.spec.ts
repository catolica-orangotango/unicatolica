import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { CursoService } from './curso.service';

describe('CursoService', () => {
  let service: CursoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('pacext.token', 'token-fake');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CursoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('lista os cursos ativos sem token (rota pública do cadastro)', () => {
    service.listar().subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/cursos`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('lista todos os cursos do administrador com o Bearer', () => {
    service.listarAdmin().subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/admin/cursos`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    req.flush([]);
  });

  it('cadastra um curso com o corpo do contrato e o Bearer', () => {
    service.cadastrar('Curso Teste').subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/cursos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nome: 'Curso Teste' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    req.flush({ id: 1, nome: 'Curso Teste', ativo: true });
  });

  it('atualiza nome e situação do curso com o Bearer', () => {
    service.atualizar(7, { nome: 'Curso Novo', ativo: false }).subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}/cursos/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nome: 'Curso Novo', ativo: false });
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    req.flush({ id: 7, nome: 'Curso Novo', ativo: false });
  });
});
