import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AdminLogin } from './admin-login';

function base64url(texto: string): string {
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tokenComPerfis(perfis: string[]): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  return `${header}.${base64url(JSON.stringify({ sub: '1', roles: perfis }))}.assinatura-ignorada`;
}

describe('AdminLogin', () => {
  let fixture: ComponentFixture<AdminLogin>;
  let httpMock: HttpTestingController;
  let router: Router;

  async function montar(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [AdminLogin],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AdminLogin);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function preencherEEnviar(el: HTMLElement, email = 'admin@catolicasc.edu.br', senha = 'Senha123!'): void {
    const campoEmail = el.querySelector('#admin-email') as HTMLInputElement;
    const campoSenha = el.querySelector('#admin-senha') as HTMLInputElement;
    campoEmail.value = email;
    campoEmail.dispatchEvent(new Event('input'));
    campoSenha.value = senha;
    campoSenha.dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('mostra o título da área administrativa (tela própria, não a do aluno)', async () => {
    const el = await montar();

    expect(el.querySelector('h1')?.textContent).toContain('Acesso do administrador');
    expect(el.textContent).toContain('Administração');
  });

  it('não envia nada quando o formulário está inválido', async () => {
    const el = await montar();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/auth/login`);
    expect(el.textContent).toContain('Informe um e-mail válido.');
  });

  it('administrador: guarda o token e vai para /admin', async () => {
    const el = await montar();
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    preencherEEnviar(el);
    httpMock.expectOne(`${API_BASE_URL}/auth/login`).flush({ token: tokenComPerfis(['ADMINISTRADOR']) });

    expect(localStorage.getItem('pacext.token')).toBeTruthy();
    expect(navegar).toHaveBeenCalledWith('/admin');
  });

  it('aluno: recusa com mensagem de acesso restrito e não guarda token', async () => {
    const el = await montar();
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    preencherEEnviar(el);
    httpMock.expectOne(`${API_BASE_URL}/auth/login`).flush({ token: tokenComPerfis(['ALUNO']) });
    fixture.detectChanges();

    expect(localStorage.getItem('pacext.token')).toBeNull();
    expect(navegar).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Acesso restrito');
  });

  it('credencial inválida (401): mostra "E-mail ou senha inválidos."', async () => {
    const el = await montar();

    preencherEEnviar(el);
    httpMock
      .expectOne(`${API_BASE_URL}/auth/login`)
      .flush({ error: { code: 'CREDENCIAL_INVALIDA' } }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('E-mail ou senha inválidos.');
  });

  it('servidor fora do ar: não diz que a senha está errada', async () => {
    const el = await montar();

    preencherEEnviar(el);
    httpMock.expectOne(`${API_BASE_URL}/auth/login`).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar');
  });
});
