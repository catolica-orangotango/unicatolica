import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Cadastro } from './cadastro';

const CURSOS = [
  { id: 1, nome: 'Administração' },
  { id: 14, nome: 'Engenharia de Software' },
];

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
    // A lista de cursos do select vem de GET /cursos assim que a tela abre.
    httpMock.expectOne('http://localhost:8080/cursos').flush(CURSOS);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function preencherFormularioValido(): void {
    component['form'].setValue({
      nome: 'Ana Silva',
      email: 'ana@catolicasc.edu.br',
      senha: 'Senha123!',
      confirmarSenha: 'Senha123!',
      cursoId: 14,
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
    const CAMPOS = ['nome', 'email', 'senha', 'confirmarSenha', 'cursoId', 'dataNascimento'] as const;

    beforeEach(() => {
      fixture.detectChanges();
      component['enviar'](); // formulário vazio -> markAllAsTouched, sem request
      fixture.detectChanges();
    });

    it('renderiza um .campo-erro com id para cada um dos seis campos', () => {
      const erros = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.campo-erro')];
      expect(erros).toHaveLength(6);
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

  describe('Confirmar senha (DT-1)', () => {
    it('vazio, depois de tocar, mostra "Confirme sua senha."', () => {
      fixture.detectChanges();
      component['form'].controls.confirmarSenha.markAsTouched();
      fixture.detectChanges();

      const erro = (fixture.nativeElement as HTMLElement).querySelector('#erro-confirmarSenha');
      expect(erro?.textContent?.trim()).toBe('Confirme sua senha.');
    });

    it('senhas diferentes, depois de tocar, marca o campo como inválido (sem mensagem) e não envia', () => {
      fixture.detectChanges();
      component['form'].setValue({
        nome: 'Ana Silva',
        email: 'ana@catolicasc.edu.br',
        senha: 'Senha123!',
        confirmarSenha: 'OutraSenha456@',
        cursoId: 14,
        dataNascimento: '2005-01-01',
      });
      component['form'].controls.confirmarSenha.markAsTouched();
      fixture.detectChanges();

      const campo = (fixture.nativeElement as HTMLElement).querySelector('#confirmarSenha');
      expect(campo?.getAttribute('aria-invalid')).toBe('true');
      expect((fixture.nativeElement as HTMLElement).querySelector('#erro-confirmarSenha')).toBeNull();

      component['enviar']();
      httpMock.expectNone('http://localhost:8080/auth/registro');
    });

    it('senhas iguais: cadastra normalmente e não leva confirmarSenha no corpo', () => {
      preencherFormularioValido();

      component['enviar']();

      const request = httpMock.expectOne('http://localhost:8080/auth/registro');
      expect(request.request.body.senha).toBe('Senha123!');
      expect(request.request.body.confirmarSenha).toBeUndefined();
      request.flush({
        id: 1,
        nome: 'Ana Silva',
        email: 'ana@catolicasc.edu.br',
        curso: 'Engenharia de Software',
        emailConfirmado: false,
        criadoEm: '2026-08-27T00:00:00Z',
      });
    });

    it('mudar a Senha depois reavalia o estado inválido de Confirmar senha', () => {
      fixture.detectChanges();
      preencherFormularioValido(); // senha e confirmarSenha == 'Senha123!', sem erro
      component['form'].controls.confirmarSenha.markAsTouched(); // já tocou o campo antes
      fixture.detectChanges();
      let campo = (fixture.nativeElement as HTMLElement).querySelector('#confirmarSenha');
      expect(campo?.getAttribute('aria-invalid')).toBeNull();

      component['form'].controls.senha.setValue('outraSenhaAgora');
      fixture.detectChanges();

      campo = (fixture.nativeElement as HTMLElement).querySelector('#confirmarSenha');
      expect(campo?.getAttribute('aria-invalid')).toBe('true');
    });

    it('senha vazia com confirmar senha preenchida não mostra "As senhas não conferem." (revisão do PR #58)', () => {
      fixture.detectChanges();
      component['form'].setValue({
        nome: 'Ana Silva',
        email: 'ana@catolicasc.edu.br',
        senha: '',
        confirmarSenha: 'senha123',
        cursoId: 14,
        dataNascimento: '2005-01-01',
      });
      component['form'].controls.confirmarSenha.markAsTouched();
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('#erro-confirmarSenha')).toBeNull();
    });

    it('revalidar só o campo confirmarSenha (onlySelf) não apaga o estado inválido de senhas diferentes (regressão do PR #58)', () => {
      // `updateValueAndValidity()` sem opções já propaga pro grupo por padrão (reproduziria
      // o bug "por acidente" mesmo sem o fix). `{ onlySelf: true }` é o que isola de verdade
      // a revalidação do campo, reproduzindo o cenário real do bug: o validador original
      // gravava o erro via confirmarSenha.setErrors(...), que o próprio
      // Validators.required do campo apaga ao rodar sozinho (sem o grupo ter a chance de
      // restaurar). O erro agora vive no grupo (form.hasError('senhasDiferentes')), que uma
      // revalidação isolada do filho não mexe.
      fixture.detectChanges();
      component['form'].setValue({
        nome: 'Ana Silva',
        email: 'ana@catolicasc.edu.br',
        senha: 'senha123',
        confirmarSenha: 'outraSenha',
        cursoId: 14,
        dataNascimento: '2005-01-01',
      });
      component['form'].controls.confirmarSenha.markAsTouched();
      fixture.detectChanges();
      let campo = (fixture.nativeElement as HTMLElement).querySelector('#confirmarSenha');
      expect(campo?.getAttribute('aria-invalid')).toBe('true');

      component['form'].controls.confirmarSenha.updateValueAndValidity({ onlySelf: true });
      fixture.detectChanges();

      campo = (fixture.nativeElement as HTMLElement).querySelector('#confirmarSenha');
      expect(campo?.getAttribute('aria-invalid')).toBe('true');
    });

    it('monta o corpo da requisição só com os campos do contrato de POST /auth/registro', () => {
      preencherFormularioValido();

      component['enviar']();

      const request = httpMock.expectOne('http://localhost:8080/auth/registro');
      expect(Object.keys(request.request.body).sort()).toEqual(
        ['cursoId', 'dataNascimento', 'email', 'nome', 'senha'].sort(),
      );
      request.flush({
        id: 1,
        nome: 'Ana Silva',
        email: 'ana@catolicasc.edu.br',
        curso: 'Engenharia de Software',
        emailConfirmado: false,
        criadoEm: '2026-08-27T00:00:00Z',
      });
    });
  });

  describe('Mostrar senhas (segurar o botão)', () => {
    function tiposDosCampos(el: HTMLElement): [string | null, string | null] {
      return [
        el.querySelector('#senha')?.getAttribute('type') ?? null,
        el.querySelector('#confirmarSenha')?.getAttribute('type') ?? null,
      ];
    }

    it('os dois campos começam como password', () => {
      const el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();

      expect(tiposDosCampos(el)).toEqual(['password', 'password']);
    });

    it('pressionar (mousedown) mostra as duas senhas como texto; soltar (mouseup) esconde de novo', () => {
      const el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      const botao = el.querySelector('.cadastro__botao-olho') as HTMLButtonElement;

      botao.dispatchEvent(new MouseEvent('mousedown'));
      fixture.detectChanges();
      expect(tiposDosCampos(el)).toEqual(['text', 'text']);
      expect(botao.getAttribute('aria-label')).toBe('Mostrando as senhas');

      botao.dispatchEvent(new MouseEvent('mouseup'));
      fixture.detectChanges();
      expect(tiposDosCampos(el)).toEqual(['password', 'password']);
    });

    it('soltar o mouse fora do botão (mouseleave) também esconde', () => {
      const el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      const botao = el.querySelector('.cadastro__botao-olho') as HTMLButtonElement;

      botao.dispatchEvent(new MouseEvent('mousedown'));
      botao.dispatchEvent(new MouseEvent('mouseleave'));
      fixture.detectChanges();

      expect(tiposDosCampos(el)).toEqual(['password', 'password']);
    });

    it('funciona pelo teclado: Enter/Espaço pressionado mostra, soltar esconde', () => {
      const el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      const botao = el.querySelector('.cadastro__botao-olho') as HTMLButtonElement;

      botao.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      fixture.detectChanges();
      expect(tiposDosCampos(el)).toEqual(['text', 'text']);

      botao.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
      fixture.detectChanges();
      expect(tiposDosCampos(el)).toEqual(['password', 'password']);
    });

    it('perder o foco do botão (blur) esconde, mesmo sem mouseup/keyup', () => {
      const el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();
      const botao = el.querySelector('.cadastro__botao-olho') as HTMLButtonElement;

      botao.dispatchEvent(new MouseEvent('mousedown'));
      botao.dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();

      expect(tiposDosCampos(el)).toEqual(['password', 'password']);
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

  it('o curso é um select com os cursos de GET /cursos e envia o cursoId', () => {
    fixture.detectChanges();
    const select = (fixture.nativeElement as HTMLElement).querySelector('select#cursoId') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
      'Selecione seu curso',
      'Administração',
      'Engenharia de Software',
    ]);

    select.value = select.options[2].value;
    select.dispatchEvent(new Event('change'));
    expect(component['form'].controls.cursoId.value).toBe(14);

    preencherFormularioValido();
    component['enviar']();
    const request = httpMock.expectOne('http://localhost:8080/auth/registro');
    expect(request.request.body.cursoId).toBe(14);
    expect(request.request.body.curso).toBeUndefined();
    request.flush({
      id: 1,
      nome: 'Ana Silva',
      email: 'ana@catolicasc.edu.br',
      curso: 'Engenharia de Software',
      emailConfirmado: false,
      criadoEm: '2026-08-27T00:00:00Z',
    });
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

describe('Cadastro sem a lista de cursos', () => {
  it('avisa quando GET /cursos falha', async () => {
    await TestBed.configureTestingModule({
      imports: [Cadastro],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Cadastro);
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne('http://localhost:8080/cursos').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar os cursos',
    );
    httpMock.verify();
  });
});

// Describe de nível superior (não aninhado em `describe('Cadastro', ...)`) de propósito:
// setup próprio por teste, em vez do `fixture`/`component` compartilhado nos `let` do
// describe principal, pra não depender de nenhum estado deixado por outro teste do mesmo
// arquivo.
describe('Cadastro - Requisitos de senha (DT-2, KAN-50)', () => {
  const CURSOS = [
    { id: 1, nome: 'Administração' },
    { id: 14, nome: 'Engenharia de Software' },
  ];

  async function montar(): Promise<{ fixture: ComponentFixture<Cadastro>; component: Cadastro; httpMock: HttpTestingController }> {
    await TestBed.configureTestingModule({
      imports: [Cadastro],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(Cadastro);
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne('http://localhost:8080/cursos').flush(CURSOS);

    return { fixture, component: fixture.componentInstance, httpMock };
  }

  function textoRequisitos(fixture: ComponentFixture<Cadastro>): string[] {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.cadastro__requisito')].map((el) =>
      el.textContent!.trim(),
    );
  }

  function requisitosAtendidos(fixture: ComponentFixture<Cadastro>): boolean[] {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('.cadastro__requisito')].map((el) =>
      el.classList.contains('cadastro__requisito--ok'),
    );
  }

  it('mostra os quatro requisitos, todos pendentes quando o campo está vazio', async () => {
    const { fixture } = await montar();
    fixture.detectChanges();

    expect(textoRequisitos(fixture)).toEqual([
      '○ Mínimo de 8 caracteres',
      '○ Pelo menos uma letra maiúscula',
      '○ Pelo menos um número',
      '○ Pelo menos um caractere especial',
    ]);
    expect(requisitosAtendidos(fixture)).toEqual([false, false, false, false]);
    fixture.destroy();
  });

  it('marca como atendido só o que a senha digitada já cumpre', async () => {
    const { fixture, component } = await montar();
    fixture.detectChanges();
    component['form'].controls.senha.setValue('senhacomprida'); // 8+ chars e minúsculas, sem maiúscula/número/especial
    fixture.detectChanges();
    // App zoneless: um detectChanges() sozinho não garante que o agendamento de CD
    // assentou - whenStable() espera o ciclo pendente antes de ler o DOM.
    await fixture.whenStable();

    expect(requisitosAtendidos(fixture)).toEqual([true, false, false, false]);
    fixture.destroy();
  });

  it('marca os quatro como atendidos quando a senha cumpre a política inteira', async () => {
    const { fixture, component } = await montar();
    fixture.detectChanges();
    component['form'].controls.senha.setValue('Senha123!');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(requisitosAtendidos(fixture)).toEqual([true, true, true, true]);
    fixture.destroy();
  });

  it('senha fraca, depois de tocar, mostra a mensagem genérica e não envia', async () => {
    const { fixture, component, httpMock } = await montar();
    fixture.detectChanges();
    component['form'].setValue({
      nome: 'Ana Silva',
      email: 'ana@catolicasc.edu.br',
      senha: 'fraca',
      confirmarSenha: 'fraca',
      cursoId: 14,
      dataNascimento: '2005-01-01',
    });
    component['form'].controls.senha.markAsTouched();
    fixture.detectChanges();

    const erro = (fixture.nativeElement as HTMLElement).querySelector('#erro-senha');
    expect(erro?.textContent?.trim()).toBe('Sua senha não atende aos requisitos abaixo.');

    component['enviar']();
    httpMock.expectNone('http://localhost:8080/auth/registro');
    httpMock.verify();
    fixture.destroy();
  });
});
