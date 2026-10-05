import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { sessaoExpiradaInterceptor } from './sessao-expirada.interceptor';

describe('sessaoExpiradaInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessaoExpiradaInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    localStorage.setItem('pacext.token', 'token-vencido');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('401 em chamada autenticada apaga o token e volta para /login?sessao=expirada', () => {
    const erro = vi.fn();
    http.get('/api/x', { headers: { Authorization: 'Bearer token-vencido' } }).subscribe({ error: erro });

    httpMock.expectOne('/api/x').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('pacext.token')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { sessao: 'expirada' } });
    // O erro continua chegando a quem chamou.
    expect(erro).toHaveBeenCalled();
  });

  it('401 sem Authorization (credencial inválida no login) não encerra sessão', () => {
    http.post('/auth/login', {}).subscribe({ error: () => undefined });

    httpMock.expectOne('/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('pacext.token')).toBe('token-vencido');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('outros erros (ex.: 403) não encerram sessão', () => {
    http.get('/api/x', { headers: { Authorization: 'Bearer t' } }).subscribe({ error: () => undefined });

    httpMock.expectOne('/api/x').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(localStorage.getItem('pacext.token')).toBe('token-vencido');
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
