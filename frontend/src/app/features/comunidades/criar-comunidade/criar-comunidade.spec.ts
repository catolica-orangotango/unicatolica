import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { Comunidade } from '../comunidades.service';
import { CriarComunidade } from './criar-comunidade';

const CRIADA: Comunidade = {
  id: 42,
  nome: 'Clube de Xadrez',
  descricao: 'Partidas às quintas',
  tipo: 'ABERTA',
  souMembro: null,
  criadoEm: '2026-10-05T12:00:00Z',
};

describe('CriarComunidade', () => {
  let fixture: ComponentFixture<CriarComunidade>;
  let httpMock: HttpTestingController;
  let toasts: string[];
  let navegar: ReturnType<typeof vi.spyOn>;

  async function montar(): Promise<HTMLElement> {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [CriarComunidade],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(CriarComunidade);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function digitar(el: HTMLElement, seletor: string, texto: string): void {
    const campo = el.querySelector(seletor) as HTMLInputElement | HTMLTextAreaElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
  }

  function enviar(el: HTMLElement): void {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('sem nome não envia e marca o campo como inválido (RF22)', async () => {
    const el = await montar();

    enviar(el);

    httpMock.expectNone(`${API_BASE_URL}/comunidades`);
    expect(el.querySelector('#nome')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#erro-nome')?.textContent?.trim()).toBe('Informe o nome da comunidade.');
  });

  it('nome só com espaços conta como vazio', async () => {
    const el = await montar();

    digitar(el, '#nome', '   ');
    enviar(el);

    httpMock.expectNone(`${API_BASE_URL}/comunidades`);
    expect(el.querySelector('#erro-nome')).not.toBeNull();
  });

  it('limita o nome a 150 caracteres, o tamanho da coluna', async () => {
    const el = await montar();

    expect(el.querySelector('#nome')?.getAttribute('maxlength')).toBe('150');
  });

  it('cria com nome sem espaços nas pontas, atualiza a sidebar e abre a comunidade nova', async () => {
    const el = await montar();

    digitar(el, '#nome', '  Clube de Xadrez  ');
    digitar(el, '#descricao', 'Partidas às quintas');
    enviar(el);

    const requisicao = httpMock.expectOne(`${API_BASE_URL}/comunidades`);
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ nome: 'Clube de Xadrez', descricao: 'Partidas às quintas' });
    requisicao.flush(CRIADA, { status: 201, statusText: 'Created' });
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([CRIADA]);

    expect(toasts).toEqual(['Comunidade Clube de Xadrez criada']);
    expect(navegar).toHaveBeenCalledWith(['/comunidades', 42]);
  });

  it('descrição em branco vai como null', async () => {
    const el = await montar();

    digitar(el, '#nome', 'Clube de Xadrez');
    digitar(el, '#descricao', '   ');
    enviar(el);

    const requisicao = httpMock.expectOne(`${API_BASE_URL}/comunidades`);
    expect(requisicao.request.body).toEqual({ nome: 'Clube de Xadrez', descricao: null });
    requisicao.flush(CRIADA, { status: 201, statusText: 'Created' });
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([CRIADA]);
  });

  it('se só a recarga da sidebar falhar, a criação continua valendo', async () => {
    const el = await montar();

    digitar(el, '#nome', 'Clube de Xadrez');
    enviar(el);

    httpMock.expectOne(`${API_BASE_URL}/comunidades`).flush(CRIADA, { status: 201, statusText: 'Created' });
    httpMock
      .expectOne(`${API_BASE_URL}/comunidades/minhas`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(navegar).toHaveBeenCalledWith(['/comunidades', 42]);
  });

  it('nome já em uso (409) mostra a mensagem do backend e libera o botão', async () => {
    const el = await montar();

    digitar(el, '#nome', 'Clube de Xadrez');
    enviar(el);
    httpMock.expectOne(`${API_BASE_URL}/comunidades`).flush(
      { error: { code: 'COMUNIDADE_NOME_EM_USO', message: 'Já existe uma comunidade com esse nome.', details: null } },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Já existe uma comunidade com esse nome.');
    expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('erro inesperado mostra mensagem genérica', async () => {
    const el = await montar();

    digitar(el, '#nome', 'Clube de Xadrez');
    enviar(el);
    httpMock
      .expectOne(`${API_BASE_URL}/comunidades`)
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Não foi possível criar a comunidade agora. Tente novamente em instantes.',
    );
  });
});
