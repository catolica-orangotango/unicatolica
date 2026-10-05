import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { SessaoAtividadeService } from './sessao-atividade.service';

const MINUTO = 60_000;
const INATIVIDADE = 15 * MINUTO;

/** JWT sem assinatura com iat/exp em segundos, como o backend emite. */
function token(emitidoEm: number, expiraEm: number): string {
  const payload = btoa(JSON.stringify({ sub: '1', iat: emitidoEm / 1000, exp: expiraEm / 1000 }));
  return `h.${payload}.a`;
}

describe('SessaoAtividadeService (KAN-78)', () => {
  let service: SessaoAtividadeService;
  let httpMock: HttpTestingController;
  let navigateSpy: ReturnType<typeof vi.spyOn>;
  const emitidoEm = 1_000_000 * MINUTO;
  const expiraEm = emitidoEm + INATIVIDADE;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(SessaoAtividadeService);
    httpMock = TestBed.inject(HttpTestingController);
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    localStorage.setItem('pacext.token', token(emitidoEm, expiraEm));
  });

  afterEach(() => {
    service.parar();
    httpMock.verify();
  });

  function atividadeEm(instante: number): void {
    localStorage.setItem('pacext.ultimaAtividade', String(instante));
  }

  it('usuário ativo com mais da metade do prazo: não renova nem encerra', () => {
    atividadeEm(emitidoEm + 2 * MINUTO);

    service.verificar(emitidoEm + 3 * MINUTO);

    httpMock.expectNone('http://localhost:8080/auth/refresh');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('usuário ativo com menos da metade do prazo: renova e guarda o token novo', () => {
    atividadeEm(emitidoEm + 9 * MINUTO);

    service.verificar(emitidoEm + 10 * MINUTO);

    const req = httpMock.expectOne('http://localhost:8080/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token(emitidoEm, expiraEm)}`);
    req.flush({ token: 'token-novo' });
    expect(localStorage.getItem('pacext.token')).toBe('token-novo');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('sem atividade desde a emissão: não renova', () => {
    atividadeEm(emitidoEm - MINUTO);

    service.verificar(emitidoEm + 10 * MINUTO);

    httpMock.expectNone('http://localhost:8080/auth/refresh');
  });

  it('não dispara um segundo refresh enquanto o primeiro está em andamento', () => {
    atividadeEm(emitidoEm + 9 * MINUTO);

    service.verificar(emitidoEm + 10 * MINUTO);
    service.verificar(emitidoEm + 10 * MINUTO + 15_000);

    httpMock.expectOne('http://localhost:8080/auth/refresh').flush({ token: 'token-novo' });
  });

  it('15 minutos sem atividade: apaga o token e volta para /login?sessao=expirada', () => {
    atividadeEm(emitidoEm + MINUTO);

    service.verificar(emitidoEm + MINUTO + INATIVIDADE);

    expect(localStorage.getItem('pacext.token')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { sessao: 'expirada' } });
  });

  it('token vencido: encerra mesmo com atividade recente', () => {
    atividadeEm(expiraEm);

    service.verificar(expiraEm);

    expect(localStorage.getItem('pacext.token')).toBeNull();
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('atividade de outra aba (localStorage) mantém esta aba logada', () => {
    // Esta aba não registrou nada desde a emissão; outra aba registrou há pouco.
    atividadeEm(emitidoEm + 9 * MINUTO);

    service.verificar(emitidoEm + 14 * MINUTO);

    expect(navigateSpy).not.toHaveBeenCalled();
    httpMock.expectOne('http://localhost:8080/auth/refresh').flush({ token: 'token-novo' });
  });

  it('iniciar registra atividade, e eventos do usuário atualizam o instante compartilhado', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(emitidoEm);
      service.iniciar();
      expect(localStorage.getItem('pacext.ultimaAtividade')).toBe(String(emitidoEm));

      vi.setSystemTime(emitidoEm + MINUTO);
      document.dispatchEvent(new Event('keydown'));

      expect(localStorage.getItem('pacext.ultimaAtividade')).toBe(String(emitidoEm + MINUTO));
    } finally {
      service.parar();
      vi.useRealTimers();
    }
  });

  it('parar remove os listeners: eventos depois disso não contam', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(emitidoEm);
      service.iniciar();
      service.parar();

      vi.setSystemTime(emitidoEm + MINUTO);
      document.dispatchEvent(new Event('keydown'));

      expect(localStorage.getItem('pacext.ultimaAtividade')).toBe(String(emitidoEm));
    } finally {
      vi.useRealTimers();
    }
  });
});
