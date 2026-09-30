import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { Publicacao } from '../publicacoes.service';
import { FeedComunidade } from './feed-comunidade';

const URL_FEED = `${API_BASE_URL}/comunidades/27/publicacoes`;

function post(id: number, conteudo: string, nome = 'Ana Lima'): Publicacao {
  return {
    id,
    comunidadeId: 27,
    autor: { id: 100 + id, nome, curso: 'Engenharia de Software' },
    conteudo,
    criadoEm: new Date().toISOString(),
  };
}

function pagina(content: Publicacao[], page = 0, totalPages = 1) {
  return { content, page, size: 20, totalElements: content.length, totalPages };
}

describe('FeedComunidade', () => {
  let fixture: ComponentFixture<FeedComunidade>;
  let httpMock: HttpTestingController;
  let toasts: string[];

  async function montar(opcoes: { souMembro: boolean; tipo?: 'CURSO' | 'ABERTA' }): Promise<HTMLElement> {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [FeedComunidade],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FeedComunidade);
    fixture.componentRef.setInput('comunidadeId', 27);
    fixture.componentRef.setInput('comunidadeNome', 'Clube de Xadrez');
    fixture.componentRef.setInput('tipo', opcoes.tipo ?? 'ABERTA');
    fixture.componentRef.setInput('souMembro', opcoes.souMembro);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function requisicaoFeed(paginaEsperada = 0): TestRequest {
    const req = httpMock.expectOne((r) => r.url === URL_FEED && r.method === 'GET');
    expect(req.request.params.get('pagina')).toBe(String(paginaEsperada));
    expect(req.request.params.get('tamanho')).toBe('20');
    return req;
  }

  function digitar(el: HTMLElement, texto: string): void {
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = texto;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function botaoPublicar(el: HTMLElement): HTMLButtonElement {
    return el.querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  afterEach(() => httpMock.verify());

  it('lista as postagens com autor, badge da comunidade, horário relativo e corpo', async () => {
    const el = await montar({ souMembro: true });
    requisicaoFeed().flush(pagina([post(2, 'Alguém para uma partida hoje?'), post(1, 'Bem-vindos!', 'Bruno Reis')]));
    fixture.detectChanges();

    const posts = el.querySelectorAll('.feed__post');
    expect(posts.length).toBe(2);
    expect(posts[0].querySelector('.feed__autor')?.textContent?.trim()).toBe('Ana Lima');
    expect(posts[0].querySelector('.feed__avatar')?.textContent?.trim()).toBe('AL');
    expect(posts[0].querySelector('uc-badge')?.textContent?.trim()).toBe('Clube de Xadrez');
    expect(posts[0].querySelector('time')?.textContent?.trim()).toBe('agora');
    expect(posts[0].querySelector('.feed__conteudo')?.textContent).toBe('Alguém para uma partida hoje?');
    expect(posts[1].querySelector('.feed__autor')?.textContent?.trim()).toBe('Bruno Reis');
    // Story 4.4: o nome do autor abre o perfil dele.
    expect(posts[0].querySelector('a.feed__autor')?.getAttribute('href')).toBe('/usuarios/102');
  });

  it('membro sem postagens vê o convite para começar a conversa', async () => {
    const el = await montar({ souMembro: true });
    requisicaoFeed().flush(pagina([]));
    fixture.detectChanges();

    expect(el.textContent).toContain('Que tal começar a conversa?');
  });

  it('não-membro lê o feed, mas vê o aviso no lugar da caixa de postar (RF27.1)', async () => {
    const el = await montar({ souMembro: false, tipo: 'CURSO' });
    requisicaoFeed().flush(pagina([post(1, 'Prova adiada')]));
    fixture.detectChanges();

    expect(el.querySelector('textarea')).toBeNull();
    expect(el.textContent).toContain('Só alunos deste curso publicam aqui.');
    expect(el.querySelectorAll('.feed__post').length).toBe(1);
  });

  it('publica, coloca a postagem no topo, limpa a caixa e avisa com toast', async () => {
    const el = await montar({ souMembro: true });
    requisicaoFeed().flush(pagina([post(1, 'antiga')]));
    fixture.detectChanges();

    expect(botaoPublicar(el).disabled).toBe(true);
    digitar(el, 'nova postagem');
    expect(botaoPublicar(el).disabled).toBe(false);
    botaoPublicar(el).click();

    const req = httpMock.expectOne((r) => r.url === URL_FEED && r.method === 'POST');
    expect(req.request.body).toEqual({ conteudo: 'nova postagem' });
    req.flush(post(2, 'nova postagem'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const conteudos = [...el.querySelectorAll('.feed__conteudo')].map((p) => p.textContent);
    expect(conteudos).toEqual(['nova postagem', 'antiga']);
    expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('');
    expect(toasts).toEqual(['Postagem publicada']);
  });

  it('conteúdo só com espaços não habilita o botão', async () => {
    const el = await montar({ souMembro: true });
    requisicaoFeed().flush(pagina([]));
    fixture.detectChanges();

    digitar(el, '   \n  ');

    expect(botaoPublicar(el).disabled).toBe(true);
  });

  it('acima de 5000 caracteres mostra o excesso e desabilita o botão', async () => {
    const el = await montar({ souMembro: true });
    requisicaoFeed().flush(pagina([]));
    fixture.detectChanges();

    digitar(el, 'a'.repeat(5003));

    expect(el.querySelector('.feed__restantes')?.textContent).toContain('Passou 3 do limite de 5000');
    expect(botaoPublicar(el).disabled).toBe(true);
  });

  it('403/422 da API mostram a mensagem dela; outro erro mostra mensagem genérica', async () => {
    const el = await montar({ souMembro: true });
    requisicaoFeed().flush(pagina([]));
    fixture.detectChanges();

    digitar(el, 'oi');
    botaoPublicar(el).click();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(
        { error: { code: 'NAO_E_MEMBRO', message: 'Só membros da comunidade podem publicar nela.', details: null } },
        { status: 403, statusText: 'Forbidden' },
      );
    fixture.detectChanges();
    expect(el.querySelector('.feed__erro')?.textContent).toContain('Só membros da comunidade podem publicar nela.');

    botaoPublicar(el).click();
    httpMock.expectOne((r) => r.method === 'POST').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível publicar agora.');
  });

  it('erro ao carregar o feed mostra alerta', async () => {
    const el = await montar({ souMembro: true });
    requisicaoFeed().flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(el.querySelector('.feed [role="alert"]')?.textContent).toContain('Não foi possível carregar as postagens');
  });

  it('"Ver postagens anteriores" busca a próxima página e junta no fim', async () => {
    const el = await montar({ souMembro: true });
    requisicaoFeed().flush(pagina([post(3, 'terceira')], 0, 2));
    fixture.detectChanges();

    (el.querySelector('.feed__mais') as HTMLButtonElement).click();
    requisicaoFeed(1).flush(pagina([post(2, 'segunda'), post(1, 'primeira')], 1, 2));
    fixture.detectChanges();

    const conteudos = [...el.querySelectorAll('.feed__conteudo')].map((p) => p.textContent);
    expect(conteudos).toEqual(['terceira', 'segunda', 'primeira']);
    expect(el.querySelector('.feed__mais')).toBeNull();
  });
});
