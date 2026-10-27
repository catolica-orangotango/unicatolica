import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { CursoAdmin } from '../../identidade/curso.service';
import { CursosAdmin } from './cursos-admin';

const CURSOS: CursoAdmin[] = [
  { id: 1, nome: 'Administração', ativo: true },
  { id: 2, nome: 'Direito', ativo: false },
];

describe('CursosAdmin', () => {
  let fixture: ComponentFixture<CursosAdmin>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;
  let toasts: string[];

  beforeEach(async () => {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [CursosAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CursosAdmin);
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/admin/cursos`).flush(CURSOS);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => httpMock.verify());

  function botao(rotulo: string): HTMLButtonElement {
    const encontrado = Array.from(el.querySelectorAll('button')).find(
      (b) => b.getAttribute('aria-label') === rotulo || b.textContent?.trim() === rotulo,
    );
    if (!encontrado) throw new Error(`botão "${rotulo}" não encontrado`);
    return encontrado;
  }

  function digitar(seletor: string, texto: string): void {
    const campo = el.querySelector(seletor) as HTMLInputElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
  }

  function nomes(): string[] {
    return Array.from(el.querySelectorAll('.cursos__nome')).map((n) => n.textContent?.trim() ?? '');
  }

  it('lista todos os cursos, inclusive os inativos, com a situação', () => {
    expect(nomes()).toEqual(['Administração', 'Direito']);
    const situacoes = Array.from(el.querySelectorAll('.cursos__situacao')).map((s) => s.textContent?.trim());
    expect(situacoes).toEqual(['Ativo', 'Inativo']);
  });

  it('cadastra o curso, mantém a lista em ordem e avisa por toast', () => {
    digitar('#curso-novo-nome', '  Biomedicina ');
    botao('Cadastrar curso').click();

    const req = httpMock.expectOne(`${API_BASE_URL}/cursos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nome: 'Biomedicina' });
    req.flush({ id: 3, nome: 'Biomedicina', ativo: true });
    fixture.detectChanges();

    expect(nomes()).toEqual(['Administração', 'Biomedicina', 'Direito']);
    expect((el.querySelector('#curso-novo-nome') as HTMLInputElement).value).toBe('');
    expect(toasts).toEqual(['Curso Biomedicina cadastrado e comunidade de curso criada']);
  });

  it('nome em branco não envia e mostra o erro ligado ao campo', () => {
    digitar('#curso-novo-nome', '   ');
    botao('Cadastrar curso').click();
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/cursos`);
    const campo = el.querySelector('#curso-novo-nome') as HTMLInputElement;
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#erro-curso-novo-nome')?.textContent).toContain('Informe o nome do curso');
  });

  it('nome em uso (409) mostra a mensagem da API e não altera a lista', () => {
    digitar('#curso-novo-nome', 'Direito');
    botao('Cadastrar curso').click();

    httpMock
      .expectOne(`${API_BASE_URL}/cursos`)
      .flush(
        { error: { code: 'CURSO_NOME_EM_USO', message: 'Já existe um curso com esse nome.', details: null } },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Já existe um curso com esse nome.');
    expect(nomes()).toEqual(['Administração', 'Direito']);
    expect(toasts).toEqual([]);
  });

  it('renomeia mantendo a situação e atualiza a lista', () => {
    botao('Renomear Administração').click();
    fixture.detectChanges();
    digitar('input[aria-label="Novo nome de Administração"]', ' Administração de Empresas ');
    botao('Salvar').click();

    const req = httpMock.expectOne(`${API_BASE_URL}/cursos/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nome: 'Administração de Empresas', ativo: true });
    req.flush({ id: 1, nome: 'Administração de Empresas', ativo: true });
    fixture.detectChanges();

    expect(nomes()).toEqual(['Administração de Empresas', 'Direito']);
    expect(toasts).toEqual(['Curso renomeado para Administração de Empresas']);
  });

  it('desativar pede confirmação e só então envia ativo=false', () => {
    botao('Desativar Administração').click();
    fixture.detectChanges();
    httpMock.expectNone(`${API_BASE_URL}/cursos/1`);

    botao('Confirmar').click();
    const req = httpMock.expectOne(`${API_BASE_URL}/cursos/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nome: 'Administração', ativo: false });
    req.flush({ id: 1, nome: 'Administração', ativo: false });
    fixture.detectChanges();

    const situacoes = Array.from(el.querySelectorAll('.cursos__situacao')).map((s) => s.textContent?.trim());
    expect(situacoes).toEqual(['Inativo', 'Inativo']);
    expect(toasts).toEqual(['Curso Administração desativado']);
  });

  it('cancelar a desativação não chama a API', () => {
    botao('Desativar Administração').click();
    fixture.detectChanges();
    botao('Cancelar').click();
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/cursos/1`);
    expect(el.querySelector('[role="group"]')).toBeNull();
  });

  it('reativa um curso inativo sem pedir confirmação', () => {
    botao('Reativar Direito').click();

    const req = httpMock.expectOne(`${API_BASE_URL}/cursos/2`);
    expect(req.request.body).toEqual({ nome: 'Direito', ativo: true });
    req.flush({ id: 2, nome: 'Direito', ativo: true });
    fixture.detectChanges();

    expect(toasts).toEqual(['Curso Direito reativado']);
  });
});
