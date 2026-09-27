import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ConfirmarEmail } from './confirmar-email';

describe('ConfirmarEmail', () => {
  let httpMock: HttpTestingController;

  function criarComponente(token: string | null): ComponentFixture<ConfirmarEmail> {
    TestBed.configureTestingModule({
      imports: [ConfirmarEmail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(ConfirmarEmail);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('confirma o e-mail automaticamente ao carregar com um token válido', () => {
    const fixture = criarComponente('token-valido');
    const component = fixture.componentInstance;

    httpMock.expectOne('http://localhost:8080/auth/confirmacao-email/token-valido').flush(null);

    expect(component['estado']()).toBe('confirmado');
  });

  it('mostra erro quando o backend rejeita o token', () => {
    const fixture = criarComponente('token-expirado');
    const component = fixture.componentInstance;

    httpMock.expectOne('http://localhost:8080/auth/confirmacao-email/token-expirado').flush(
      { error: { code: 'TOKEN_CONFIRMACAO_EXPIRADO', message: 'Link de confirmação expirado. Solicite um novo.' } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(component['estado']()).toBe('erro');
    expect(component['mensagemErro']()).toBe('Link de confirmação expirado. Solicite um novo.');
  });

  it('mostra erro sem chamar a API quando não há token na URL', () => {
    criarComponente(null);

    httpMock.expectNone(() => true);
  });

  // -- Story 14.7: casca pública + textos que são contrato de e2e ----------

  it('renderiza o estado de erro dentro de um único landmark <main>, com heading e link verbatim', () => {
    const fixture = criarComponente(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('main')).toHaveLength(1);
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Não foi possível confirmar');

    const link = compiled.querySelector('a')!;
    expect(link.textContent?.trim()).toBe('Voltar ao cadastro');
    expect(link.getAttribute('href')).toBe('/cadastro');
  });

  it('renderiza o estado de sucesso com heading e link verbatim', () => {
    const fixture = criarComponente('token-valido');
    httpMock.expectOne('http://localhost:8080/auth/confirmacao-email/token-valido').flush(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('E-mail confirmado!');

    const link = compiled.querySelector('a')!;
    expect(link.textContent?.trim()).toBe('Ir para o login');
    expect(link.getAttribute('href')).toBe('/login');
  });
});
