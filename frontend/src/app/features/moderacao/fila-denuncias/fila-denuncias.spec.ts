import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { Denuncia, ModeracaoService, SituacaoDenuncia } from '../moderacao.service';
import { FilaDenuncias } from './fila-denuncias';

const URL_FILA = `${API_BASE_URL}/moderacao/denuncias`;

function denuncia(id: number, publicacaoId: number, motivo = 'spam'): Denuncia {
  return {
    id,
    conteudo: {
      tipo: 'PUBLICACAO',
      id: publicacaoId,
      texto: `postagem ${publicacaoId}`,
      autor: { id: 50, nome: 'Bruno Kramer', curso: null },
      comunidadeId: 27,
      criadoEm: new Date().toISOString(),
      situacao: 'VISIVEL',
    },
    motivo,
    situacao: 'PENDENTE',
    criadoEm: new Date().toISOString(),
    resolvidaEm: null,
  };
}

function pagina(content: Denuncia[], totalPages = 1) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages };
}

describe('FilaDenuncias', () => {
  let fixture: ComponentFixture<FilaDenuncias>;
  let httpMock: HttpTestingController;
  let toasts: string[];
  let el: HTMLElement;

  async function montar(): Promise<void> {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [FilaDenuncias],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FilaDenuncias);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  function requisicaoFila(situacao: SituacaoDenuncia = 'PENDENTE', tamanho = '20'): TestRequest {
    const req = httpMock.expectOne(
      (r) => r.url === URL_FILA && r.params.get('situacao') === situacao && r.params.get('tamanho') === tamanho,
    );
    return req;
  }

  function itens(): string[] {
    return [...el.querySelectorAll('.fila__item-motivo')].map((e) => (e.textContent ?? '').trim());
  }

  function botao(texto: string): HTMLButtonElement {
    return [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto) as HTMLButtonElement;
  }

  function digitar(texto: string): void {
    const campo = el.querySelector('textarea') as HTMLTextAreaElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  afterEach(() => httpMock.verify());

  it('carrega as pendentes, seleciona a primeira e mostra o painel de análise', async () => {
    await montar();
    requisicaoFila().flush(pagina([denuncia(1, 7, 'spam'), denuncia(2, 8, 'ofensivo')]));
    fixture.detectChanges();

    expect(itens()).toEqual(['spam', 'ofensivo']);
    expect(el.querySelector('.fila__item--selecionado .fila__item-motivo')?.textContent?.trim()).toBe('spam');
    expect(el.querySelector('app-analise-denuncia')?.textContent).toContain('Denúncia #1');

    (el.querySelectorAll('.fila__item')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('app-analise-denuncia')?.textContent).toContain('Denúncia #2');
  });

  it('fila vazia mostra o estado de tudo em ordem', async () => {
    await montar();
    requisicaoFila().flush(pagina([]));
    fixture.detectChanges();

    expect(el.textContent).toContain('Nenhuma denúncia pendente. Tudo em ordem por aqui.');
  });

  it('erro ao carregar mostra o aviso', async () => {
    await montar();
    requisicaoFila().flush(null, { status: 500, statusText: 'Erro' });
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Não conseguimos carregar as denúncias');
  });

  it('ocultar tira da fila as pendentes da mesma postagem e atualiza o contador', async () => {
    await montar();
    requisicaoFila().flush(pagina([denuncia(1, 7), denuncia(2, 8, 'ofensivo'), denuncia(3, 7, 'repetida')]));
    fixture.detectChanges();

    digitar('Conteúdo ofensivo.');
    botao('Ocultar postagem').click();
    const req = httpMock.expectOne(`${URL_FILA}/1/ocultacao`);
    expect(req.request.body).toEqual({ motivo: 'Conteúdo ofensivo.' });
    req.flush({ ...denuncia(1, 7), situacao: 'RESOLVIDA' });
    requisicaoFila('PENDENTE', '1').flush({ ...pagina([]), totalElements: 1 });
    fixture.detectChanges();

    expect(itens()).toEqual(['ofensivo']);
    expect(toasts).toEqual(['Postagem ocultada']);
    expect(TestBed.inject(ModeracaoService).pendentes()).toBe(1);
    expect(el.querySelector('app-analise-denuncia')?.textContent).toContain('Denúncia #2');
  });

  it('descartar tira só a denúncia escolhida', async () => {
    await montar();
    requisicaoFila().flush(pagina([denuncia(1, 7), denuncia(3, 7, 'repetida')]));
    fixture.detectChanges();

    botao('Descartar denúncia').click();
    const req = httpMock.expectOne(`${URL_FILA}/1/descarte`);
    expect(req.request.body).toEqual({});
    req.flush({ ...denuncia(1, 7), situacao: 'DESCARTADA' });
    requisicaoFila('PENDENTE', '1').flush(pagina([]));
    fixture.detectChanges();

    expect(itens()).toEqual(['repetida']);
    expect(toasts).toEqual(['Denúncia descartada']);
  });

  it('conflito mostra a mensagem da API no painel e mantém a fila', async () => {
    await montar();
    requisicaoFila().flush(pagina([denuncia(1, 7)]));
    fixture.detectChanges();

    botao('Descartar denúncia').click();
    httpMock
      .expectOne(`${URL_FILA}/1/descarte`)
      .flush(
        { error: { code: 'SITUACAO_INVALIDA', message: 'Esta denúncia já foi analisada.' } },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(itens()).toEqual(['spam']);
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Esta denúncia já foi analisada.');
  });

  it('filtro Resolvidas recarrega e restaurar atualiza o item no lugar', async () => {
    await montar();
    requisicaoFila().flush(pagina([]));
    fixture.detectChanges();

    botao('Resolvidas').click();
    fixture.detectChanges();
    expect(botao('Resolvidas').getAttribute('aria-pressed')).toBe('true');
    const oculta = { ...denuncia(5, 9), situacao: 'RESOLVIDA' as const };
    oculta.conteudo = { ...oculta.conteudo, situacao: 'OCULTO' };
    requisicaoFila('RESOLVIDA').flush(pagina([oculta]));
    fixture.detectChanges();

    botao('Restaurar postagem').click();
    httpMock
      .expectOne(`${URL_FILA}/5/restauracao`)
      .flush({ ...oculta, conteudo: { ...oculta.conteudo, situacao: 'VISIVEL' } });
    requisicaoFila('PENDENTE', '1').flush(pagina([]));
    fixture.detectChanges();

    expect(itens()).toEqual(['spam']);
    expect(toasts).toEqual(['Postagem restaurada']);
    expect(el.textContent).toContain('a postagem está visível no feed');
  });

  it('"Ver mais denúncias" acrescenta a próxima página', async () => {
    await montar();
    requisicaoFila().flush(pagina([denuncia(1, 7)], 2));
    fixture.detectChanges();

    botao('Ver mais denúncias').click();
    const req = httpMock.expectOne((r) => r.url === URL_FILA && r.params.get('pagina') === '1');
    req.flush({ content: [denuncia(2, 8, 'ofensivo')], page: 1, size: 20, totalElements: 2, totalPages: 2 });
    fixture.detectChanges();

    expect(itens()).toEqual(['spam', 'ofensivo']);
    expect(botao('Ver mais denúncias')).toBeUndefined();
  });
});
