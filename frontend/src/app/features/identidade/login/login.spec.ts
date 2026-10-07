import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('cria o componente', () => {
    expect(component).toBeTruthy();
  });

  it('renderiza os campos de e-mail e senha', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input[type="email"]')).toBeTruthy();
    expect(compiled.querySelector('input[type="password"]')).toBeTruthy();
  });

  // -- Story 14.7: piso de acessibilidade (A-11) e Design System ------------

  it('renderiza um único landmark <main> com um <h1> dentro (vindo da casca pública)', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('main')).toHaveLength(1);
    const titulos = compiled.querySelectorAll('h1');
    expect(titulos).toHaveLength(1);
    expect(titulos[0].textContent?.trim()).toBe('Entrar');
  });

  it('usa o botão forte do Design System (button[uc-button]) como submit', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const submit = compiled.querySelector('button[type="submit"]')!;
    expect(submit.hasAttribute('uc-button')).toBe(true);
    expect(submit.textContent?.trim()).toBe('Entrar');
    // No máximo uma ação laranja por tela (DESIGN.md).
    expect(compiled.querySelectorAll('[uc-button]')).toHaveLength(1);
  });

  it('mantém a ordem de tabulação e-mail -> senha -> Entrar', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const focaveis = [...compiled.querySelectorAll('input, button, a[href], select, textarea')];
    expect(focaveis.slice(0, 3).map((el) => el.id || el.tagName.toLowerCase())).toEqual([
      'email',
      'senha',
      'button',
    ]);
  });

  it('não envia a requisição quando o formulário é inválido', () => {
    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitButton.click();

    httpMock.expectNone('http://localhost:8080/auth/login');
  });

  it('navega para /feed quando o formulário é válido', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const emailInput = compiled.querySelector('input[type="email"]') as HTMLInputElement;
    const senhaInput = compiled.querySelector('input[type="password"]') as HTMLInputElement;

    emailInput.value = 'aluno@catolicasc.edu.br';
    emailInput.dispatchEvent(new Event('input'));
    senhaInput.value = 'Senha123!';
    senhaInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (compiled.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: 'token-fake' });
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith('/feed');
  });

  it('mostra mensagem de erro quando as credenciais são inválidas', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const emailInput = compiled.querySelector('input[type="email"]') as HTMLInputElement;
    const senhaInput = compiled.querySelector('input[type="password"]') as HTMLInputElement;

    emailInput.value = 'aluno@catolicasc.edu.br';
    emailInput.dispatchEvent(new Event('input'));
    senhaInput.value = 'senha-errada';
    senhaInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (compiled.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    httpMock.expectOne('http://localhost:8080/auth/login').flush('Credencial inválida', { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(compiled.textContent).toContain('E-mail ou senha inválidos.');

    // The `login.scss style contract` block below pins WHAT `.login__erro` looks
    // like; without this the class could be dropped from the template and the
    // notice would render unstyled with that block still green.
    const alerta = compiled.querySelector('[role="alert"]')!;
    expect(alerta, 'no role="alert" element rendered for the 401').toBeTruthy();
    expect(
      alerta.classList.contains('login__erro'),
      'the rendered alert does not carry the class login.scss styles',
    ).toBe(true);
  });

  it('redireciona para /feed no construtor quando já existe um token válido', () => {
    localStorage.setItem('pacext.token', 'token-existente');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const localFixture = TestBed.createComponent(Login);
    localFixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith('/feed');
  });
});

describe('Login com sessão expirada (KAN-78)', () => {
  function criar(queryParams: Record<string, string>): HTMLElement {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
      ],
    });
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra o aviso de sessão expirada com ?sessao=expirada', () => {
    const aviso = criar({ sessao: 'expirada' }).querySelector('.login__aviso');

    expect(aviso?.getAttribute('role')).toBe('status');
    expect(aviso?.textContent).toContain('Sua sessão expirou');
  });

  it('não mostra o aviso sem o parâmetro', () => {
    expect(criar({}).querySelector('.login__aviso')).toBeNull();
  });

  it('não redireciona para /feed com token vencido no localStorage', () => {
    localStorage.clear();
    const exp = Math.floor(Date.now() / 1000) - 60;
    localStorage.setItem('pacext.token', `h.${btoa(JSON.stringify({ sub: '1', exp }))}.a`);
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    TestBed.createComponent(Login).detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});

// jsdom cannot read computed styles from an external stylesheet, so the visual
// half of the 401 row of the I/O matrix is pinned to the SCSS source, the same
// way badge.spec.ts / member-indicator.spec.ts pin theirs. `scss-guard.spec.ts`
// proves the file is token-only; this proves WHICH tokens the error notice uses.
describe('login.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const scss = readFileSync(join(dir, 'login.scss'), 'utf8');
  const norm = scss.replace(/\s+/g, ' ');

  it('is wired to the component via styleUrl', () => {
    expect(readFileSync(join(dir, 'login.ts'), 'utf8')).toContain("styleUrl: './login.scss'");
  });

  it('renders the credential error as error-coloured text and border on a surface card', () => {
    const regra = norm.match(/\.login__erro\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(regra).toContain('color: var(--uc-color-error)');
    expect(regra).toContain('border: 1px solid var(--uc-color-error)');
    // Never a filled red block (DESIGN.md "Do's and Don'ts"): the fill stays surface.
    expect(regra).toContain('background: var(--uc-color-surface)');
    expect(regra).not.toContain('background: var(--uc-color-error)');
  });

  it('never paints maroon as a background anywhere on the screen', () => {
    expect(norm).not.toMatch(/background(-color)?:\s*var\(--uc-color-maroon\)/);
  });
});
