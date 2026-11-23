import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { Enquete } from '../enquetes.service';
import { EnquetesComunidade } from './enquetes-comunidade';

const UNICA: Enquete = {
  id: 1,
  comunidadeId: 7,
  autor: { id: 3, nome: 'Aluno Teste', curso: null },
  pergunta: 'Melhor dia?',
  tipo: 'UNICA',
  limiteSelecao: null,
  opcoes: [{ id: 10, texto: 'Segunda' }, { id: 11, texto: 'Terça' }],
  situacao: 'ATIVA',
  jaVotei: false,
  resultado: null,
  criadaEm: new Date().toISOString(),
};

const MULTIPLA: Enquete = {
  ...UNICA,
  id: 2,
  pergunta: 'Quais dias?',
  tipo: 'MULTIPLA',
  limiteSelecao: 2,
  opcoes: [{ id: 20, texto: 'Segunda' }, { id: 21, texto: 'Terça' }, { id: 22, texto: 'Quarta' }],
};

describe('EnquetesComunidade', () => {
  let fixture: ComponentFixture<EnquetesComunidade>;
  let httpMock: HttpTestingController;
  let toasts: string[];

  async function montar(souMembro: boolean, enquetes: Enquete[]): Promise<HTMLElement> {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [EnquetesComunidade],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { obterCabecalhoAutorizacao: () => ({}) } },
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EnquetesComunidade);
    fixture.componentRef.setInput('comunidadeId', 7);
    fixture.componentRef.setInput('souMembro', souMembro);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/comunidades/7/enquetes`)
      .flush({ content: enquetes, page: 0, size: 20, totalElements: enquetes.length, totalPages: enquetes.length > 0 ? 1 : 0 });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /** Depois de votar a tela busca a lista de novo (o resultado depende do total de votos). */
  function responderRecarga(enquetes: Enquete[]): void {
    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/comunidades/7/enquetes`)
      .flush({ content: enquetes, page: 0, size: 20, totalElements: enquetes.length, totalPages: 1 });
    fixture.detectChanges();
  }

  function marcar(el: HTMLElement, rotulo: string): void {
    const campo = Array.from(el.querySelectorAll('label.enquetes__rotulo'))
      .find((l) => (l.textContent ?? '').includes(rotulo))!
      .querySelector('input') as HTMLInputElement;
    campo.click();
    fixture.detectChanges();
  }

  function votar(el: HTMLElement, indice = 0): void {
    (el.querySelectorAll('button[type="submit"]')[indice] as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('não membro vê as opções e o aviso de que só membro vota (RF55.1)', async () => {
    const el = await montar(false, [UNICA]);

    expect(el.querySelector('#enquetes-titulo')?.textContent).toBe('Enquetes');
    expect(el.querySelector('.enquetes__pergunta')?.textContent).toBe('Melhor dia?');
    expect(el.querySelector('.enquetes__tipo')?.textContent).toBe('Escolha única');
    expect(Array.from(el.querySelectorAll('.enquetes__opcao')).map((o) => o.textContent)).toEqual(['Segunda', 'Terça']);
    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('.enquetes__estado')?.textContent).toContain('Só membros da comunidade podem votar');
    expect(el.querySelector('.enquetes__meta a')?.getAttribute('href')).toBe('/usuarios/3');
  });

  it('mostra o tipo de uma enquete de escolha múltipla com o limite', async () => {
    const el = await montar(false, [MULTIPLA]);

    expect(el.querySelector('.enquetes__tipo')?.textContent).toBe('Escolha múltipla, até 2 opções');
  });

  it('sem enquetes não mostra nada, nem o título', async () => {
    const el = await montar(true, []);

    expect(el.querySelector('#enquetes-titulo')).toBeNull();
    expect(el.textContent?.trim()).toBe('');
  });

  it('se a consulta falha, avisa sem derrubar a página', async () => {
    toasts = [];
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

    httpMock.expectOne((r) => r.url === `${API_BASE_URL}/comunidades/7/enquetes`).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.enquetes__erro')?.getAttribute('role')).toBe('alert');
  });

  it('membro que ainda não votou vê botões de opção e o botão Votar', async () => {
    const el = await montar(true, [UNICA]);

    const campos = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(campos.map((c) => c.type)).toEqual(['radio', 'radio']);
    expect(el.querySelector('[role="radiogroup"]')?.getAttribute('aria-labelledby')).toBe('pergunta-1');
    expect(el.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Votar');
  });

  it('em escolha única, escolher outra opção troca a marcada', async () => {
    const el = await montar(true, [UNICA]);

    marcar(el, 'Segunda');
    marcar(el, 'Terça');

    const [segunda, terca] = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(segunda.checked).toBe(false);
    expect(terca.checked).toBe(true);
  });

  it('envia o voto, avisa com toast e passa a mostrar que já votou', async () => {
    const el = await montar(true, [UNICA]);
    marcar(el, 'Terça');

    votar(el);

    const req = httpMock.expectOne(`${API_BASE_URL}/enquetes/1/votos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ opcaoIds: [11] });
    req.flush(null, { status: 204, statusText: 'No Content' });
    responderRecarga([{ ...UNICA, jaVotei: true, resultado: { totalVotantes: 1, votosNecessarios: 5, liberado: false, opcoes: [] } }]);

    expect(toasts).toEqual(['Voto registrado']);
    expect(el.textContent).toContain('Você já votou nesta enquete');
    expect(el.textContent).toContain('1 de 5 votos necessários');
    expect(el.querySelector('button[type="submit"]')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
  });

  it('sem escolher nenhuma opção não envia e pede para escolher', async () => {
    const el = await montar(true, [UNICA]);

    votar(el);

    httpMock.expectNone(`${API_BASE_URL}/enquetes/1/votos`);
    expect(el.querySelector('.enquetes__erro-voto')?.getAttribute('role')).toBe('alert');
    expect(el.querySelector('.enquetes__erro-voto')?.textContent).toContain('Escolha uma opção');
  });

  it('em escolha múltipla, ao chegar no limite as demais opções ficam desabilitadas (RF54.2)', async () => {
    const el = await montar(true, [MULTIPLA]);

    marcar(el, 'Segunda');
    marcar(el, 'Terça');

    const [segunda, terca, quarta] = Array.from(el.querySelectorAll('input')) as HTMLInputElement[];
    expect(segunda.disabled).toBe(false);
    expect(terca.disabled).toBe(false);
    expect(quarta.disabled).toBe(true);

    marcar(el, 'Segunda'); // desmarca e libera de novo
    expect(quarta.disabled).toBe(false);
  });

  it('em escolha múltipla envia todas as opções marcadas', async () => {
    const el = await montar(true, [MULTIPLA]);
    marcar(el, 'Segunda');
    marcar(el, 'Quarta');

    votar(el);

    const req = httpMock.expectOne(`${API_BASE_URL}/enquetes/2/votos`);
    expect(req.request.body).toEqual({ opcaoIds: [20, 22] });
    req.flush(null, { status: 204, statusText: 'No Content' });
    responderRecarga([MULTIPLA]);
  });

  describe('resultado (Story 8.5)', () => {
    const resultadoLiberado = {
      totalVotantes: 5,
      votosNecessarios: 5,
      liberado: true,
      opcoes: [
        { opcaoId: 10, votos: 4 },
        { opcaoId: 11, votos: 1 },
      ],
    };

    it('votou e a enquete tem 5 votos ou mais: mostra as barras com votos e percentual (RF57, RF58)', async () => {
      const el = await montar(true, [{ ...UNICA, jaVotei: true, resultado: resultadoLiberado }]);

      const linhas = Array.from(el.querySelectorAll('.enquetes__resultado'));
      expect(linhas.length).toBe(2);
      expect(linhas[0].textContent).toContain('4 votos');
      expect(linhas[0].textContent).toContain('80%');
      expect(linhas[1].textContent).toContain('1 voto');
      expect(linhas[1].textContent).not.toContain('1 votos');
      expect(el.querySelector('input')).toBeNull();
      expect(el.querySelector('.enquetes__estado')?.textContent).toContain('Total: 5 votos');
    });

    it('votou mas há menos de 5 votos: mostra "X de 5" no lugar do resultado (RF58.1)', async () => {
      const el = await montar(true, [
        { ...UNICA, jaVotei: true, resultado: { totalVotantes: 4, votosNecessarios: 5, liberado: false, opcoes: [] } },
      ]);

      expect(el.querySelector('.enquetes__resultado')).toBeNull();
      expect(el.textContent).toContain('4 de 5 votos necessários');
    });

    it('ainda não votou: tela de votação, sem resultado nem total', async () => {
      const el = await montar(true, [UNICA]);

      expect(el.querySelector('.enquetes__resultado')).toBeNull();
      expect(el.textContent).not.toContain('necessários');
      expect(el.querySelector('button[type="submit"]')).not.toBeNull();
    });
  });

  it('enquete em que o usuário já votou não oferece votar de novo (RF56.1)', async () => {
    const el = await montar(true, [{ ...UNICA, jaVotei: true }]);

    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('.enquetes__estado')?.textContent).toContain('Você já votou nesta enquete');
  });

  it('enquete encerrada ou ocultada mostra que não aceita votos', async () => {
    const el = await montar(true, [{ ...UNICA, situacao: 'OCULTA' }]);

    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('.enquetes__estado')?.textContent).toContain('não aceita mais votos');
  });

  it('se o servidor diz que já votou (outra aba), a tela passa a mostrar isso', async () => {
    const el = await montar(true, [UNICA]);
    marcar(el, 'Segunda');
    votar(el);

    httpMock
      .expectOne(`${API_BASE_URL}/enquetes/1/votos`)
      .flush({ error: { code: 'JA_VOTOU', message: 'Você já votou nesta enquete.' } }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect(el.querySelector('.enquetes__estado')?.textContent).toContain('Você já votou nesta enquete');
    expect(toasts).toEqual([]);
  });

  it('mostra a mensagem do servidor quando recusa o voto (422) e mantém a escolha', async () => {
    const el = await montar(true, [UNICA]);
    marcar(el, 'Segunda');
    votar(el);

    httpMock
      .expectOne(`${API_BASE_URL}/enquetes/1/votos`)
      .flush(
        { error: { code: 'OPCAO_INVALIDA', message: 'Escolha apenas opções desta enquete.' } },
        { status: 422, statusText: 'Unprocessable' },
      );
    fixture.detectChanges();

    expect(el.querySelector('.enquetes__erro-voto')?.textContent).toContain('Escolha apenas opções desta enquete');
    expect((el.querySelector('input') as HTMLInputElement).checked).toBe(true);
  });

  it('erro genérico do servidor (500) aparece como aviso', async () => {
    const el = await montar(true, [UNICA]);
    marcar(el, 'Segunda');
    votar(el);

    httpMock.expectOne(`${API_BASE_URL}/enquetes/1/votos`).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('.enquetes__erro-voto')?.textContent).toContain('Não foi possível registrar o voto agora');
  });
});
