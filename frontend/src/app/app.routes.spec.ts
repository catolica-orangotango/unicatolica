import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';

/** Stub de AuthService com token ajustável - só o necessário para o guard e a casca. */
class AuthStub {
  token: string | null = null;
  obterToken(): string | null {
    return this.token;
  }
  sessaoValida(): boolean {
    return this.token !== null;
  }
  encerrarSessaoLocal(): void {
    this.token = null;
  }
  possuiPerfil(): boolean {
    return false;
  }
  logout(): void {}
  // Épico 2: Shell agora injeta ComunidadesService, que chama isto pra montar o
  // header de toda chamada autenticada — sem o stub aqui, o Shell nem instancia.
  obterCabecalhoAutorizacao(): Record<string, string> {
    return {};
  }
}

describe('app.routes - wiring do auth guard sobre a tabela real de rotas', () => {
  let auth: AuthStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useClass: AuthStub },
      ],
    });
    auth = TestBed.inject(AuthService) as unknown as AuthStub;
  });

  it('sem token, navegar para /feed redireciona para /login e a casca não renderiza', async () => {
    auth.token = null;
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/feed');

    expect(TestBed.inject(Router).url).toBe('/login');
    expect(harness.fixture.nativeElement.querySelector('app-shell')).toBeNull();
  });

  it('com token, /feed renderiza a casca (app-shell) com o feed aninhado', async () => {
    auth.token = 'token-fake';
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/feed');
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/feed');
    const shell = harness.fixture.nativeElement.querySelector('app-shell');
    expect(shell).toBeTruthy();
    expect(shell.querySelector('app-feed')).toBeTruthy();
  });
});
