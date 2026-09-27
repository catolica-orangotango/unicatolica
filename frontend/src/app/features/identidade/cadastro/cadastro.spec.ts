import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Cadastro } from './cadastro';

describe('Cadastro', () => {
  let fixture: ComponentFixture<Cadastro>;
  let component: Cadastro;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cadastro],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Cadastro);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function preencherFormularioValido(): void {
    component['form'].setValue({
      nome: 'Ana Silva',
      email: 'ana@catolicasc.edu.br',
      senha: 'senha123',
      curso: 'Engenharia de Software',
      dataNascimento: '2005-01-01',
    });
  }

  it('não envia requisição quando o formulário é inválido', () => {
    component['enviar']();

    httpMock.expectNone('http://localhost:8080/auth/registro');
    expect(component['form'].touched).toBe(true);
  });

  it('envia o cadastro e exibe os dados retornados em caso de sucesso', () => {
    preencherFormularioValido();

    component['enviar']();

    const request = httpMock.expectOne('http://localhost:8080/auth/registro');
    expect(request.request.method).toBe('POST');
    request.flush({
      id: 1,
      nome: 'Ana Silva',
      email: 'ana@catolicasc.edu.br',
      curso: 'Engenharia de Software',
      emailConfirmado: false,
      criadoEm: '2026-08-27T00:00:00Z',
    });

    expect(component['sucesso']()?.email).toBe('ana@catolicasc.edu.br');
    expect(component['erro']()).toBeNull();
  });

  it('exibe a mensagem específica do envelope de erro quando a API rejeita', () => {
    preencherFormularioValido();

    component['enviar']();

    const request = httpMock.expectOne('http://localhost:8080/auth/registro');
    request.flush(
      { error: { code: 'EMAIL_JA_CADASTRADO', message: 'Esse e-mail já tem uma conta. Esqueceu a senha?' } },
      { status: 409, statusText: 'Conflict' },
    );

    expect(component['erro']()).toBe('Esse e-mail já tem uma conta. Esqueceu a senha?');
    expect(component['sucesso']()).toBeNull();

    // Story 14.7 moved this banner into the new `@else` branch of the
    // success/form split. Asserting only the signal let the whole
    // `@if (erro())` block be deleted with the suite green, which would leave a
    // rejected signup with no explanation at all - the one thing cadastro.ts is
    // written to guarantee ("nunca uma mensagem genérica").
    fixture.detectChanges();

    const aviso = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')!;
    expect(aviso, 'no role="alert" element rendered for the API rejection').toBeTruthy();
    expect(aviso.classList.contains('cadastro__aviso--erro')).toBe(true);
    expect(aviso.textContent).toContain('Esse e-mail já tem uma conta. Esqueceu a senha?');
  });

  // -- Story 14.7: piso de acessibilidade (A-11) e Design System -----------

  describe('erros de campo anunciados (A-11)', () => {
    const CAMPOS = ['nome', 'email', 'senha', 'curso', 'dataNascimento'] as const;

    beforeEach(() => {
      fixture.detectChanges();
      component['enviar'](); // formulário vazio -> markAllAsTouched, sem request
      fixture.detectChanges();
    });

    it('renderiza um .campo-erro com id para cada um dos cinco campos', () => {
      const erros = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.campo-erro')];
      expect(erros).toHaveLength(5);
      expect(erros.map((el) => el.id)).toEqual(CAMPOS.map((campo) => `erro-${campo}`));
    });

    it('liga cada input inválido ao próprio erro por aria-invalid + aria-describedby', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      for (const campo of CAMPOS) {
        const input = compiled.querySelector(`#${campo}`)!;
        expect(input.getAttribute('aria-invalid'), campo).toBe('true');
        expect(input.getAttribute('aria-describedby'), campo).toBe(`erro-${campo}`);
        expect(compiled.querySelector(`#erro-${campo}`), campo).toBeTruthy();
      }
    });

    it('não anuncia erro em campo válido', () => {
      preencherFormularioValido();
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelectorAll('.campo-erro')).toHaveLength(0);
      expect(compiled.querySelector('#nome')!.getAttribute('aria-invalid')).toBeNull();
      expect(compiled.querySelector('#nome')!.getAttribute('aria-describedby')).toBeNull();
    });
  });

  it('usa o botão forte do Design System e uma única ação laranja', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const submit = compiled.querySelector('button[type="submit"]')!;

    expect(submit.hasAttribute('uc-button')).toBe(true);
    expect(compiled.querySelectorAll('[uc-button]')).toHaveLength(1);
    expect(compiled.querySelectorAll('main')).toHaveLength(1);
  });

  it('mostra o estado "Verifique seu e-mail" com o e-mail ecoado e o reenvio secundário', () => {
    fixture.detectChanges();
    preencherFormularioValido();
    component['enviar']();
    httpMock.expectOne('http://localhost:8080/auth/registro').flush({
      id: 1,
      nome: 'Ana Silva',
      email: 'ana@catolicasc.edu.br',
      curso: 'Engenharia de Software',
      emailConfirmado: false,
      criadoEm: '2026-08-27T00:00:00Z',
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Verifique seu e-mail');

    const aviso = compiled.querySelector('[role="status"]')!;
    expect(aviso).toBeTruthy();
    expect(aviso.classList.contains('cadastro__aviso--sucesso')).toBe(true);
    expect(aviso.textContent).toContain('ana@catolicasc.edu.br');

    // Reenvio é pill secundária, nunca um segundo uc-button laranja.
    const reenvio = compiled.querySelector('.botao-secundario')!;
    expect(reenvio).toBeTruthy();
    expect(reenvio.hasAttribute('uc-button')).toBe(false);
    expect(compiled.querySelectorAll('[uc-button]')).toHaveLength(0);
  });

  it('não exibe mais o rótulo de story no subtítulo (voz e tom, A-10)', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Story 1.2');
  });

  it('reenvia a confirmação de e-mail depois de um cadastro bem-sucedido', () => {
    preencherFormularioValido();
    component['enviar']();
    httpMock.expectOne('http://localhost:8080/auth/registro').flush({
      id: 1,
      nome: 'Ana Silva',
      email: 'ana@catolicasc.edu.br',
      curso: 'Engenharia de Software',
      emailConfirmado: false,
      criadoEm: '2026-08-27T00:00:00Z',
    });

    component['reenviarConfirmacao']();

    const request = httpMock.expectOne('http://localhost:8080/auth/confirmacao-email/reenvio');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@catolicasc.edu.br' });
    request.flush(null, { status: 202, statusText: 'Accepted' });

    expect(component['reenviado']()).toBe(true);
  });
});
