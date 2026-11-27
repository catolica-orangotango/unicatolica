import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { Aviso } from './avisos-admin.service';
import { AvisosAdmin } from './avisos-admin';

const URL_AVISOS = `${API_BASE_URL}/admin/avisos`;
const CURSOS = [
  { id: 3, nome: 'Engenharia de Software' },
  { id: 4, nome: 'Direito' },
];

function aviso(id: number, titulo: string, extra: Partial<Aviso> = {}): Aviso {
  return {
    id,
    titulo,
    mensagem: 'Mensagem',
    escopo: 'GERAL',
    cursoId: null,
    cursoNome: null,
    dataDestaque: null,
    criadoEm: '2026-10-22T12:00:00Z',
    ...extra,
  };
}

describe('AvisosAdmin (Story 13.1)', () => {
  let fixture: ComponentFixture<AvisosAdmin>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;
  let toasts: string[];

  async function montar(recentes: Aviso[] = []): Promise<void> {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [AvisosAdmin],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AvisosAdmin);
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/cursos`).flush(CURSOS);
    httpMock
      .expectOne((r) => r.url === URL_AVISOS && r.method === 'GET')
      .flush({ content: recentes, page: 0, size: 5, totalElements: recentes.length, totalPages: 1 });
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  function preencher(titulo: string, mensagem: string, destino = '', data = ''): void {
    const campo = (id: string) => el.querySelector(`#${id}`) as HTMLInputElement;
    campo('aviso-titulo').value = titulo;
    campo('aviso-titulo').dispatchEvent(new Event('input'));
    campo('aviso-mensagem').value = mensagem;
    campo('aviso-mensagem').dispatchEvent(new Event('input'));
    const select = campo('aviso-destino') as unknown as HTMLSelectElement;
    select.value = destino;
    select.dispatchEvent(new Event('change'));
    campo('aviso-data').value = data;
    campo('aviso-data').dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('oferece "Todos os cursos" e os cursos no "Para quem"', async () => {
    await montar();

    const opcoes = [...el.querySelectorAll('#aviso-destino option')].map((o) => o.textContent?.trim());
    expect(opcoes).toEqual(['Todos os cursos', 'Engenharia de Software', 'Direito']);
  });

  it('lista os enviados recentemente com o escopo e a data de publicação', async () => {
    await montar([aviso(2, 'Palestra', { escopo: 'CURSO', cursoId: 3, cursoNome: 'Engenharia de Software' }), aviso(1, 'Feriado')]);

    const itens = [...el.querySelectorAll('.avisos__item')].map((i) => i.textContent?.replace(/\s+/g, ' ').trim());
    expect(itens[0]).toContain('Palestra');
    expect(itens[0]).toContain('Engenharia de Software · 22/10');
    expect(itens[1]).toContain('Todos os cursos · 22/10');
  });

  it('sem avisos enviados mostra o vazio', async () => {
    await montar();

    expect(el.querySelector('.avisos__vazio')?.textContent).toContain('Nenhum aviso enviado ainda.');
  });

  it('título e mensagem vazios não enviam e mostram o erro de cada campo', async () => {
    await montar();

    enviar();

    httpMock.expectNone(URL_AVISOS);
    expect(el.querySelector('#erro-aviso-titulo')?.textContent).toContain('Informe o título');
    expect(el.querySelector('#erro-aviso-mensagem')?.textContent).toContain('Escreva a mensagem');
    expect(el.querySelector('#aviso-titulo')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('publica para todos os cursos: escopo GERAL sem curso, limpa o formulário e avisa com toast', async () => {
    await montar();
    preencher('Feriado', 'Sem aula na segunda.', '', '2026-12-07');
    enviar();

    const req = httpMock.expectOne((r) => r.url === URL_AVISOS && r.method === 'POST');
    expect(req.request.body).toEqual({
      titulo: 'Feriado',
      mensagem: 'Sem aula na segunda.',
      escopo: 'GERAL',
      cursoId: null,
      dataDestaque: '2026-12-07',
    });
    req.flush(aviso(9, 'Feriado'), { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect((el.querySelector('#aviso-titulo') as HTMLInputElement).value).toBe('');
    expect(el.querySelector('.avisos__item')?.textContent).toContain('Feriado');
    expect(toasts).toEqual(['Aviso publicado']);
  });

  it('publica para um curso: escopo CURSO com o id do curso e sem data', async () => {
    await montar();
    preencher('Palestra', 'Auditório 2.', '4');
    enviar();

    const req = httpMock.expectOne((r) => r.url === URL_AVISOS && r.method === 'POST');
    expect(req.request.body).toMatchObject({ escopo: 'CURSO', cursoId: 4, dataDestaque: null });
    req.flush(aviso(10, 'Palestra', { escopo: 'CURSO', cursoId: 4, cursoNome: 'Direito' }), { status: 201, statusText: 'Created' });
  });

  it('erro da API aparece no formulário e mantém o que foi digitado', async () => {
    await montar();
    preencher('Palestra', 'Auditório 2.', '4');
    enviar();

    httpMock
      .expectOne((r) => r.url === URL_AVISOS && r.method === 'POST')
      .flush(
        { error: { code: 'CURSO_NAO_ENCONTRADO', message: 'Curso não encontrado.' } },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();

    expect(el.querySelector('.avisos__erro[role="alert"]')?.textContent).toContain('Curso não encontrado.');
    expect((el.querySelector('#aviso-titulo') as HTMLInputElement).value).toBe('Palestra');
    expect(toasts).toEqual([]);
  });
});
