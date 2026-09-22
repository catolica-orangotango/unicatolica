import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { adminGuard } from './admin.guard';

function base64url(texto: string): string {
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tokenComPerfis(perfis: string[]): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: '1', roles: perfis }));
  return `${header}.${payload}.assinatura-ignorada`;
}

describe('adminGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => localStorage.clear());

  function executar() {
    return TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
  }

  it('libera o acesso quando o token tem o perfil ADMINISTRADOR', () => {
    localStorage.setItem('pacext.token', tokenComPerfis(['ADMINISTRADOR']));

    expect(executar()).toBe(true);
  });

  it('redireciona para /admin/login quando não há token', () => {
    const resultado = executar();

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/admin/login');
  });

  it('redireciona para /admin/login quando o token é de aluno', () => {
    localStorage.setItem('pacext.token', tokenComPerfis(['ALUNO']));

    const resultado = executar();

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/admin/login');
  });
});
