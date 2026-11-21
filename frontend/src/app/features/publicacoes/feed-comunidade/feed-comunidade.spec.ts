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

/** JWT não assinado com `sub` — basta para `AuthService.usuarioId()`. */
function tokenDoUsuario(id: number): string {
  const parte = (valor: unknown) => btoa(JSON.stringify(valor)).replace(/=+$/, '');
  return `${parte({ alg: 'none' })}.${parte({ sub: String(id), roles: ['ALUNO'] })}.x`;
}

const URL_ARQUIVOS = `${API_BASE_URL}/arquivos`;
const URL_DENUNCIA = `${API_BASE_URL}/denuncias`;

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

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

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

  describe('Anexo (KAN-128)', () => {
    function arquivo(nome: string, tipo: string, tamanho = 10): File {
      const f = new File(['x'], nome, { type: tipo });
      Object.defineProperty(f, 'size', { value: tamanho });
      return f;
    }

    function escolher(el: HTMLElement, f: File): void {
      const input = el.querySelector('input[type="file"]') as HTMLInputElement;
      // jsdom não tem DataTransfer: define `files` direto.
      Object.defineProperty(input, 'files', { value: [f], configurable: true });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    }

    function botaoComTexto(el: HTMLElement, texto: string): HTMLButtonElement | undefined {
      return [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
    }

    async function montarMembro(): Promise<HTMLElement> {
      const el = await montar({ souMembro: true });
      requisicaoFeed().flush(pagina([]));
      fixture.detectChanges();
      return el;
    }

    it('o seletor aceita só PNG, JPEG e PDF', async () => {
      const el = await montarMembro();
      const input = el.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input.accept).toBe('image/png,image/jpeg,application/pdf');
    });

    it('escolher arquivo mostra o nome e "Remover anexo"; remover limpa', async () => {
      const el = await montarMembro();
      escolher(el, arquivo('apostila.pdf', 'application/pdf'));

      expect(el.querySelector('.feed__anexo-nome')?.textContent).toContain('apostila.pdf');
      botaoComTexto(el, 'Remover anexo')?.click();
      fixture.detectChanges();

      expect(el.querySelector('.feed__anexo-nome')).toBeNull();
      expect(botaoComTexto(el, 'Remover anexo')).toBeUndefined();
    });

    it('remover o anexo devolve o foco ao botão "Anexar arquivo"', async () => {
      const el = await montarMembro();
      escolher(el, arquivo('apostila.pdf', 'application/pdf'));

      botaoComTexto(el, 'Remover anexo')?.click();
      fixture.detectChanges();

      expect(document.activeElement).toBe(botaoComTexto(el, 'Anexar arquivo'));
    });

    it('tipo fora de PNG/JPEG/PDF mostra os formatos aceitos e não anexa', async () => {
      const el = await montarMembro();
      escolher(el, arquivo('a.gif', 'image/gif'));

      expect(el.querySelector('.feed__erro')?.textContent).toContain('PNG, JPEG ou PDF');
      expect(el.querySelector('.feed__anexo-nome')).toBeNull();
      expect(httpMock.match(URL_ARQUIVOS).length).toBe(0);
    });

    it('imagem acima de 2 MB e PDF acima de 5 MB são recusados sem chamar a API', async () => {
      const el = await montarMembro();
      escolher(el, arquivo('grande.png', 'image/png', 2 * 1024 * 1024 + 1));
      expect(el.querySelector('.feed__erro')?.textContent).toContain('2 MB');
      escolher(el, arquivo('grande.pdf', 'application/pdf', 5 * 1024 * 1024 + 1));
      expect(el.querySelector('.feed__erro')?.textContent).toContain('5 MB');
      expect(el.querySelector('.feed__anexo-nome')).toBeNull();
    });

    it('publicar envia o arquivo primeiro e depois cria a postagem com arquivoId', async () => {
      const el = await montarMembro();
      digitar(el, 'veja o material');
      escolher(el, arquivo('apostila.pdf', 'application/pdf'));
      botaoPublicar(el).click();

      const upload = httpMock.expectOne(URL_ARQUIVOS);
      expect((upload.request.body as FormData).get('finalidade')).toBe('ANEXO_POSTAGEM');
      expect(httpMock.match((r) => r.url === URL_FEED && r.method === 'POST').length).toBe(0);
      upload.flush({ id: 9, nome: 'apostila.pdf', tipo: 'application/pdf', tamanho: 10 });

      const req = httpMock.expectOne((r) => r.url === URL_FEED && r.method === 'POST');
      expect(req.request.body).toEqual({ conteudo: 'veja o material', arquivoId: 9 });
      req.flush({
        ...post(2, 'veja o material'),
        anexo: { id: 9, nome: 'apostila.pdf', tipo: 'application/pdf', tamanho: 10, url: 'https://s3.exemplo/9' },
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(el.querySelector('.feed__caixa .feed__anexo-nome')).toBeNull();
      expect(el.querySelector('.feed__post a.feed__anexo-link')?.textContent).toContain('apostila.pdf');
    });

    it('erro no upload mantém o texto digitado e mostra o erro', async () => {
      const el = await montarMembro();
      digitar(el, 'meu texto');
      escolher(el, arquivo('foto.png', 'image/png'));
      botaoPublicar(el).click();

      httpMock
        .expectOne(URL_ARQUIVOS)
        .flush(
          { error: { code: 'ARQUIVO_INVALIDO', message: 'O conteúdo não é um PNG válido.' } },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      fixture.detectChanges();

      expect(el.querySelector('.feed__erro')?.textContent).toContain('O conteúdo não é um PNG válido.');
      expect((el.querySelector('textarea') as HTMLTextAreaElement).value).toBe('meu texto');
      expect(botaoPublicar(el).disabled).toBe(false);
    });

    it('falha na criação após o upload mantém o arquivo e a nova tentativa não reenvia', async () => {
      const el = await montarMembro();
      digitar(el, 'texto');
      escolher(el, arquivo('foto.png', 'image/png'));
      botaoPublicar(el).click();
      httpMock.expectOne(URL_ARQUIVOS).flush({ id: 4, nome: 'foto.png', tipo: 'image/png', tamanho: 10 });
      httpMock.expectOne((r) => r.url === URL_FEED && r.method === 'POST').flush(null, { status: 500, statusText: 'x' });
      fixture.detectChanges();

      expect(el.querySelector('.feed__anexo-nome')?.textContent).toContain('foto.png');
      botaoPublicar(el).click();
      httpMock.expectNone(URL_ARQUIVOS);
      const req = httpMock.expectOne((r) => r.url === URL_FEED && r.method === 'POST');
      expect(req.request.body).toEqual({ conteudo: 'texto', arquivoId: 4 });
      req.flush(post(3, 'texto'));
    });

    it('card: imagem vira <img> com alt igual ao nome; PDF vira link em nova aba', async () => {
      const el = await montar({ souMembro: false });
      requisicaoFeed().flush(
        pagina([
          { ...post(2, 'com foto'), anexo: { id: 1, nome: 'campus.png', tipo: 'image/png', tamanho: 5, url: 'https://s3.exemplo/1' } },
          { ...post(1, 'com pdf'), anexo: { id: 2, nome: 'edital.pdf', tipo: 'application/pdf', tamanho: 5, url: 'https://s3.exemplo/2' } },
        ]),
      );
      fixture.detectChanges();

      const posts = el.querySelectorAll('.feed__post');
      const img = posts[0].querySelector('img.feed__anexo-imagem') as HTMLImageElement;
      expect(img.alt).toBe('campus.png');
      expect(img.getAttribute('src')).toBe('https://s3.exemplo/1');
      const link = posts[1].querySelector('a.feed__anexo-link') as HTMLAnchorElement;
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
      expect(link.textContent).toContain('edital.pdf');
      expect(link.getAttribute('href')).toBe('https://s3.exemplo/2');
    });
  });

  describe('Denunciar (Story 12.1)', () => {
    function botaoComTexto(el: HTMLElement, texto: string): HTMLButtonElement | undefined {
      return [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
    }

    function digitarMotivo(el: HTMLElement, texto: string): void {
      const campo = el.querySelector('.feed__denuncia textarea') as HTMLTextAreaElement;
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    async function abrirDenunciaNoPrimeiroPost(): Promise<HTMLElement> {
      const el = await montar({ souMembro: false });
      requisicaoFeed().flush(pagina([post(1, 'Link suspeito')]));
      fixture.detectChanges();
      botaoComTexto(el, 'Denunciar')?.click();
      fixture.detectChanges();
      return el;
    }

    it('abre o formulário no card, envia o motivo e marca como denunciada', async () => {
      const el = await abrirDenunciaNoPrimeiroPost();

      expect(el.querySelector('.feed__denuncia label')?.textContent?.trim()).toBe('Por que esta postagem é imprópria?');
      expect(botaoComTexto(el, 'Enviar denúncia')?.disabled).toBe(true);
      digitarMotivo(el, '  Link de phishing  ');
      botaoComTexto(el, 'Enviar denúncia')?.click();

      const req = httpMock.expectOne(URL_DENUNCIA);
      expect(req.request.body).toEqual({ tipoConteudo: 'PUBLICACAO', conteudoId: 1, motivo: 'Link de phishing' });
      req.flush({ id: 9, criadoEm: new Date().toISOString() });
      fixture.detectChanges();

      expect(el.querySelector('.feed__denuncia')).toBeNull();
      expect(el.querySelector('.feed__denunciada')?.textContent?.trim()).toBe('Denunciada');
      expect(botaoComTexto(el, 'Denunciar')).toBeUndefined();
      expect(toasts).toEqual(['Denúncia enviada. A moderação vai analisar.']);
    });

    it('cancelar fecha o formulário sem enviar', async () => {
      const el = await abrirDenunciaNoPrimeiroPost();

      botaoComTexto(el, 'Cancelar')?.click();
      fixture.detectChanges();

      expect(el.querySelector('.feed__denuncia')).toBeNull();
      expect(botaoComTexto(el, 'Denunciar')).toBeTruthy();
    });

    it('já denunciada (409) marca como denunciada e avisa com a mensagem da API', async () => {
      const el = await abrirDenunciaNoPrimeiroPost();
      digitarMotivo(el, 'spam');
      botaoComTexto(el, 'Enviar denúncia')?.click();

      httpMock
        .expectOne(URL_DENUNCIA)
        .flush(
          { error: { code: 'DENUNCIA_DUPLICADA', message: 'Você já denunciou este conteúdo.' } },
          { status: 409, statusText: 'Conflict' },
        );
      fixture.detectChanges();

      expect(el.querySelector('.feed__denunciada')).toBeTruthy();
      expect(toasts).toEqual(['Você já denunciou este conteúdo.']);
    });

    it('postagem que sumiu (404) mostra a mensagem da API no formulário', async () => {
      const el = await abrirDenunciaNoPrimeiroPost();
      digitarMotivo(el, 'spam');
      botaoComTexto(el, 'Enviar denúncia')?.click();

      httpMock
        .expectOne(URL_DENUNCIA)
        .flush(
          { error: { code: 'CONTEUDO_NAO_ENCONTRADO', message: 'Conteúdo não encontrado.' } },
          { status: 404, statusText: 'Not Found' },
        );
      fixture.detectChanges();

      expect(el.querySelector('.feed__denuncia [role="alert"]')?.textContent?.trim()).toBe('Conteúdo não encontrado.');
    });

    it('a própria postagem não mostra "Denunciar"', async () => {
      // post(1) tem autor id 101.
      localStorage.setItem('pacext.token', tokenDoUsuario(101));
      const el = await montar({ souMembro: true });
      requisicaoFeed().flush(pagina([post(1, 'minha'), post(2, 'de outra pessoa')]));
      fixture.detectChanges();

      const posts = el.querySelectorAll('.feed__post');
      expect(botaoComTexto(posts[0] as HTMLElement, 'Denunciar')).toBeUndefined();
      expect(botaoComTexto(posts[1] as HTMLElement, 'Denunciar')).toBeTruthy();
    });
  });
});
