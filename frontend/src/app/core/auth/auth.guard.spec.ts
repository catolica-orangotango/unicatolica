import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('libera o acesso quando há token', () => {
    localStorage.setItem('pacext.token', 'token-fake');

    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(resultado).toBe(true);
  });

  it('com token vencido, apaga o token e redireciona para /login?sessao=expirada (KAN-78)', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    localStorage.setItem('pacext.token', `h.${btoa(JSON.stringify({ sub: '1', exp }))}.a`);

    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    const url = TestBed.inject(Router).serializeUrl(resultado as UrlTree);
    expect(url).toBe('/login?sessao=expirada');
    expect(localStorage.getItem('pacext.token')).toBeNull();
  });

  it('redireciona para /login quando não há token', () => {
    const resultado = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(resultado).toBeInstanceOf(UrlTree);
  });
});
