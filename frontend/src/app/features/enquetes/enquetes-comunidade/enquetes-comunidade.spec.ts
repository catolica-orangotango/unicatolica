import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Enquete } from '../enquetes.service';
import { EnquetesComunidade } from './enquetes-comunidade';

const UNICA: Enquete = {
  id: 1,
  comunidadeId: 7,
  autor: { id: 3, nome: 'Aluno Teste', curso: null },
  pergunta: 'Melhor dia?',
  tipo: 'UNICA',
  limiteSelecao: null,
  opcoes: [{ id: 1, texto: 'Segunda' }, { id: 2, texto: 'Terça' }],
  situacao: 'ATIVA',
  criadaEm: new Date().toISOString(),
};

describe('EnquetesComunidade', () => {
  let fixture: ComponentFixture<EnquetesComunidade>;
  let httpMock: HttpTestingController;

  async function montar(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [EnquetesComunidade],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { obterCabecalhoAutorizacao: () => ({}) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EnquetesComunidade);
    fixture.componentRef.setInput('comunidadeId', 7);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => httpMock.verify());

  it('lista pergunta, tipo, opções e autor de cada enquete', async () => {
    const el = await montar();

    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/comunidades/7/enquetes`)
      .flush({ content: [UNICA, { ...UNICA, id: 2, tipo: 'MULTIPLA', limiteSelecao: 2 }], page: 0, size: 20, totalElements: 2, totalPages: 1 });
    fixture.detectChanges();

    expect(el.querySelector('#enquetes-titulo')?.textContent).toBe('Enquetes');
    expect(el.querySelectorAll('.enquetes__card').length).toBe(2);
    expect(el.querySelector('.enquetes__pergunta')?.textContent).toBe('Melhor dia?');
    expect(el.querySelector('.enquetes__tipo')?.textContent).toBe('Escolha única');
    expect(Array.from(el.querySelectorAll('.enquetes__card')[0].querySelectorAll('.enquetes__opcao')).map((o) => o.textContent)).toEqual([
      'Segunda',
      'Terça',
    ]);
    expect(el.querySelectorAll('.enquetes__tipo')[1].textContent).toBe('Escolha múltipla, até 2 opções');
    expect(el.querySelector('.enquetes__meta a')?.getAttribute('href')).toBe('/usuarios/3');
  });

  it('sem enquetes não mostra nada, nem o título', async () => {
    const el = await montar();

    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/comunidades/7/enquetes`)
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();

    expect(el.querySelector('#enquetes-titulo')).toBeNull();
    expect(el.textContent?.trim()).toBe('');
  });

  it('se a consulta falha, avisa sem derrubar a página', async () => {
    const el = await montar();

    httpMock.expectOne((r) => r.url === `${API_BASE_URL}/comunidades/7/enquetes`).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('.enquetes__erro')?.getAttribute('role')).toBe('alert');
  });
});
