import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { Comunidade, ComunidadesService } from '../../comunidades/comunidades.service';
import { Enquete } from '../enquetes.service';
import { CriarEnquete } from './criar-enquete';

function comunidade(id: number, nome: string): Comunidade {
  return { id, nome, descricao: null, tipo: 'ABERTA', souMembro: true, souAdministrador: false, criadoEm: '2026-10-05T12:00:00Z' };
}

function enqueteAtiva(id: number, comunidadeId: number): Enquete {
  return {
    id,
    comunidadeId,
    autor: { id: 1, nome: 'Aluno Teste', curso: null },
    pergunta: 'P?',
    tipo: 'UNICA',
    limiteSelecao: null,
    opcoes: [],
    situacao: 'ATIVA',
    jaVotei: false,
    criadaEm: '2026-11-19T12:00:00Z',
  };
}

const CRIADA: Enquete = { ...enqueteAtiva(9, 2), pergunta: 'Melhor dia?', opcoes: [{ id: 1, texto: 'Segunda' }, { id: 2, texto: 'Terça' }] };

describe('CriarEnquete', () => {
  let fixture: ComponentFixture<CriarEnquete>;
  let httpMock: HttpTestingController;
  let toasts: string[];
  let navegar: ReturnType<typeof vi.spyOn>;

  async function montar(comunidades: Comunidade[], ativas: Enquete[] = []): Promise<HTMLElement> {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [CriarEnquete],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { obterCabecalhoAutorizacao: () => ({}) } },
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
        { provide: ComunidadesService, useValue: { carregarMinhas: () => of(comunidades) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(CriarEnquete);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/enquetes/minhas`)
      .flush({ content: ativas, page: 0, size: 100, totalElements: ativas.length, totalPages: 1 });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function digitar(el: HTMLElement, seletor: string, texto: string): void {
    const campo = el.querySelector(seletor) as HTMLInputElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
  }

  function escolher(el: HTMLElement, seletor: string, rotulo: string): void {
    const select = el.querySelector(seletor) as HTMLSelectElement;
    const opcao = Array.from(select.options).find((o) => (o.textContent ?? '').includes(rotulo));
    select.value = opcao!.value;
    select.dispatchEvent(new Event('change'));
  }

  function enviar(el: HTMLElement): void {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function clicar(el: HTMLElement, texto: string): void {
    const botao = Array.from(el.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes(texto));
    botao!.click();
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('sem comunidade mostra o botão para conhecer comunidades em vez do formulário', async () => {
    const el = await montar([]);

    expect(el.querySelector('#pergunta')).toBeNull();
    const link = el.querySelector('.criar__vazio a');
    expect(link?.textContent?.trim()).toBe('Conhecer comunidades');
    expect(link?.getAttribute('href')).toBe('/comunidades');
  });

  it('desabilita a comunidade em que já há duas enquetes ativas (RF53.3)', async () => {
    const el = await montar(
      [comunidade(1, 'Xadrez'), comunidade(2, 'Corrida')],
      [enqueteAtiva(10, 1), enqueteAtiva(11, 1), enqueteAtiva(12, 2)],
    );

    const opcoes = Array.from(el.querySelectorAll('#comunidade option')) as HTMLOptionElement[];
    const xadrez = opcoes.find((o) => (o.textContent ?? '').includes('Xadrez'))!;
    const corrida = opcoes.find((o) => (o.textContent ?? '').includes('Corrida'))!;
    expect(xadrez.disabled).toBe(true);
    expect(xadrez.textContent).toContain('limite de 2 enquetes ativas');
    expect(corrida.disabled).toBe(false);
  });

  it('começa com duas opções e permite ir até cinco, sem passar disso', async () => {
    const el = await montar([comunidade(1, 'Xadrez')]);
    expect(el.querySelectorAll('.criar__opcao').length).toBe(2);

    for (let i = 0; i < 5; i++) {
      clicar(el, 'Adicionar opção');
    }

    expect(el.querySelectorAll('.criar__opcao').length).toBe(5);
    const adicionar = Array.from(el.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes('Adicionar opção'))!;
    expect(adicionar.disabled).toBe(true);
  });

  it('não deixa remover abaixo de duas opções', async () => {
    const el = await montar([comunidade(1, 'Xadrez')]);

    const remover = Array.from(el.querySelectorAll('button')).filter((b) => (b.textContent ?? '').includes('Remover'));
    expect(remover.every((b) => b.disabled)).toBe(true);
  });

  it('opção em branco bloqueia o envio e o erro é anunciado, não só colorido', async () => {
    const el = await montar([comunidade(1, 'Xadrez')]);
    escolher(el, '#comunidade', 'Xadrez');
    digitar(el, '#pergunta', 'Melhor dia?');
    digitar(el, '#opcao-0', 'Segunda');
    digitar(el, '#opcao-1', '   ');

    enviar(el);

    httpMock.expectNone(`${API_BASE_URL}/comunidades/1/enquetes`);
    expect(el.querySelector('#opcao-1')?.getAttribute('aria-invalid')).toBe('true');
    const erro = el.querySelector('#erro-opcao-1');
    expect(erro?.getAttribute('role')).toBe('alert');
    expect(erro?.textContent).toContain('Preencha a opção 2');
  });

  it('sem pergunta e sem comunidade não envia e marca os campos', async () => {
    const el = await montar([comunidade(1, 'Xadrez')]);

    enviar(el);

    httpMock.expectNone(`${API_BASE_URL}/comunidades/1/enquetes`);
    expect(el.querySelector('#erro-comunidade')?.textContent).toContain('Selecione a comunidade');
    expect(el.querySelector('#erro-pergunta')?.textContent).toContain('Escreva a pergunta');
  });

  it('escolha múltipla mostra o limite, de 2 até o número de opções, e o exige', async () => {
    const el = await montar([comunidade(1, 'Xadrez')]);
    expect(el.querySelector('#limite')).toBeNull();

    (el.querySelector('input[value="MULTIPLA"]') as HTMLInputElement).click();
    fixture.detectChanges();
    clicar(el, 'Adicionar opção');

    const limites = Array.from(el.querySelectorAll('#limite option')).map((o) => (o.textContent ?? '').trim());
    expect(limites).toEqual(['Selecione o limite', 'Até 2', 'Até 3']);

    escolher(el, '#comunidade', 'Xadrez');
    digitar(el, '#pergunta', 'Dias?');
    digitar(el, '#opcao-0', 'Segunda');
    digitar(el, '#opcao-1', 'Terça');
    digitar(el, '#opcao-2', 'Quarta');
    enviar(el);

    httpMock.expectNone(`${API_BASE_URL}/comunidades/1/enquetes`);
    expect(el.querySelector('#erro-limite')?.textContent).toContain('Informe quantas opções');
  });

  it('envia o corpo aparado, avisa com toast e volta para a comunidade', async () => {
    const el = await montar([comunidade(1, 'Xadrez'), comunidade(2, 'Corrida')]);
    escolher(el, '#comunidade', 'Corrida');
    digitar(el, '#pergunta', '  Melhor dia?  ');
    digitar(el, '#opcao-0', ' Segunda ');
    digitar(el, '#opcao-1', 'Terça');

    enviar(el);

    const req = httpMock.expectOne(`${API_BASE_URL}/comunidades/2/enquetes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ pergunta: 'Melhor dia?', tipo: 'UNICA', limiteSelecao: null, opcoes: ['Segunda', 'Terça'] });
    req.flush(CRIADA);

    expect(toasts).toEqual(['Enquete criada']);
    expect(navegar).toHaveBeenCalledWith(['/comunidades', 2]);
  });

  it('em escolha múltipla manda o limite escolhido', async () => {
    const el = await montar([comunidade(1, 'Xadrez')]);
    (el.querySelector('input[value="MULTIPLA"]') as HTMLInputElement).click();
    fixture.detectChanges();
    clicar(el, 'Adicionar opção');
    escolher(el, '#comunidade', 'Xadrez');
    digitar(el, '#pergunta', 'Dias?');
    digitar(el, '#opcao-0', 'Segunda');
    digitar(el, '#opcao-1', 'Terça');
    digitar(el, '#opcao-2', 'Quarta');
    escolher(el, '#limite', 'Até 2');

    enviar(el);

    const req = httpMock.expectOne(`${API_BASE_URL}/comunidades/1/enquetes`);
    expect(req.request.body).toEqual({ pergunta: 'Dias?', tipo: 'MULTIPLA', limiteSelecao: 2, opcoes: ['Segunda', 'Terça', 'Quarta'] });
    req.flush({ ...CRIADA, comunidadeId: 1 });
  });

  it('mostra a mensagem do backend quando o limite de ativas estoura (409)', async () => {
    const el = await montar([comunidade(1, 'Xadrez')]);
    escolher(el, '#comunidade', 'Xadrez');
    digitar(el, '#pergunta', 'Melhor dia?');
    digitar(el, '#opcao-0', 'Segunda');
    digitar(el, '#opcao-1', 'Terça');
    enviar(el);

    httpMock
      .expectOne(`${API_BASE_URL}/comunidades/1/enquetes`)
      .flush(
        { error: { code: 'LIMITE_ENQUETES_ATIVAS', message: 'Você já tem 2 enquetes ativas nesta comunidade.' } },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('.criar__erro')?.textContent).toContain('Você já tem 2 enquetes ativas');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('mostra erro genérico quando o servidor falha (500)', async () => {
    const el = await montar([comunidade(1, 'Xadrez')]);
    escolher(el, '#comunidade', 'Xadrez');
    digitar(el, '#pergunta', 'Melhor dia?');
    digitar(el, '#opcao-0', 'Segunda');
    digitar(el, '#opcao-1', 'Terça');
    enviar(el);

    httpMock.expectOne(`${API_BASE_URL}/comunidades/1/enquetes`).flush({}, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('.criar__erro')?.textContent).toContain('Não foi possível criar a enquete agora');
  });
});
