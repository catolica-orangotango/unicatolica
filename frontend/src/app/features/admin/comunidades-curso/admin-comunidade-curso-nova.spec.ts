import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AdminComunidadeCursoNova } from './admin-comunidade-curso-nova';

describe('AdminComunidadeCursoNova', () => {
  let fixture: ComponentFixture<AdminComunidadeCursoNova>;
  let httpMock: HttpTestingController;

  async function montar(): Promise<HTMLElement> {
    localStorage.setItem('pacext.token', 'token-fake');
    await TestBed.configureTestingModule({
      imports: [AdminComunidadeCursoNova],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminComunidadeCursoNova);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function preencherEEnviar(el: HTMLElement, nome = 'Fisioterapia'): void {
    const campo = el.querySelector('#curso-nome') as HTMLInputElement;
    campo.value = nome;
    campo.dispatchEvent(new Event('input'));
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('não envia nada e mostra a validação de campo quando o nome está vazio (RF22)', async () => {
    const el = await montar();

    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/comunidades/curso`);
    expect(el.textContent).toContain('Informe o nome do curso.');
  });

  it('cria a comunidade de curso e limpa o formulário pra criar a próxima', async () => {
    const el = await montar();

    preencherEEnviar(el);
    httpMock.expectOne(`${API_BASE_URL}/comunidades/curso`).flush({
      id: 27,
      nome: 'Fisioterapia',
      descricao: null,
      tipo: 'CURSO',
      souMembro: false,
      criadoEm: '2026-09-24T00:00:00Z',
    });
    fixture.detectChanges();

    expect(el.textContent).toContain('Comunidade de curso');
    expect(el.textContent).toContain('Fisioterapia');
    expect((el.querySelector('#curso-nome') as HTMLInputElement).value).toBe('');
  });

  it('nome já em uso (409): mostra a mensagem do backend', async () => {
    const el = await montar();

    preencherEEnviar(el);
    httpMock
      .expectOne(`${API_BASE_URL}/comunidades/curso`)
      .flush(
        { error: { code: 'COMUNIDADE_NOME_EM_USO', message: 'Já existe uma comunidade com esse nome.' } },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Já existe uma comunidade com esse nome.');
  });
});
