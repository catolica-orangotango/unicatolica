import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Aviso } from '../avisos/avisos.service';
import { Comunidade } from '../comunidades/comunidades.service';
import { API_BASE_URL } from '../../core/config/api.config';
import { ToastService } from '../../ui';
import { Feed } from './feed';

/**
 * Logout não é mais responsabilidade desta tela — ver {@code Shell.sair()} e
 * `layout/shell/shell.spec.ts`. Este componente só carrega e mostra dado da Home.
 */
describe('Feed', () => {
  let fixture: ComponentFixture<Feed>;
  let component: Feed;
  let httpMock: HttpTestingController;

  /** Cria o componente e responde o carregamento inicial (forkJoin do constructor). */
  async function montar(minhas: Comunidade[] = [], publicacoes: unknown[] = [], avisos: Aviso[] = []): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Feed],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Feed);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(`${API_BASE_URL}/usuarios/me`).flush({
      id: 1,
      nome: 'Julia Fontana',
      email: 'julia@catolicasc.edu.br',
      perfil: 'ALUNO',
      curso: 'Engenharia de Software',
    });
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush(minhas);
    httpMock.expectOne(`${API_BASE_URL}/avisos`).flush(avisos);
    // `expectOne(string)` casa contra a URL COM query string (urlWithParams) — esta
    // chamada sempre leva `?tipo=...&pagina=...&tamanho=...`, então precisa de um
    // predicado checando só `req.url` (sem params), não a forma de string solta.
    httpMock
      .expectOne((req) => req.url === `${API_BASE_URL}/comunidades`)
      .flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
    // O feed da comunidade (FeedComunidade) busca as publicações assim que aparece.
    for (const requisicao of httpMock.match((req) => req.url.endsWith('/publicacoes'))) {
      requisicao.flush({ content: publicacoes, page: 0, size: 20, totalElements: publicacoes.length, totalPages: 1 });
    }
    fixture.detectChanges();
  }

  function publicacao(id: number, conteudo: string, comunidadeId = 14): unknown {
    return {
      id,
      comunidadeId,
      autor: { id: 7, nome: 'Ana Beatriz Lima', curso: 'Engenharia de Software' },
      conteudo,
      criadoEm: '2026-11-23T10:00:00Z',
    };
  }

  function comunidade(id: number, nome: string, tipo: 'CURSO' | 'ABERTA'): Comunidade {
    return { id, nome, descricao: null, tipo, souMembro: true, souAdministrador: false, criadoEm: '2026-01-01T00:00:00Z' };
  }

  beforeEach(() => {
    localStorage.setItem('pacext.token', 'token-fake');
    localStorage.removeItem('pacext.autojoin-toast.14');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('cria o componente e mostra a saudação com nome e curso', async () => {
    await montar();

    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Julia Fontana');
    expect(compiled.textContent).toContain('Engenharia de Software');
  });

  it('mostra estado vazio quando não há comunidades pra descobrir', async () => {
    await montar();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhuma comunidade nova pra descobrir agora');
  });

  it('Story 2.3: mostra o toast de auto-join na primeira vez que a comunidade de curso aparece', async () => {
    const comunidadeCurso: Comunidade = {
      id: 14,
      nome: 'Engenharia de Software',
      descricao: null,
      tipo: 'CURSO',
      souMembro: true,
      souAdministrador: false,
      criadoEm: '2026-01-01T00:00:00Z',
    };
    await montar([comunidadeCurso]);
    const toastService = TestBed.inject(ToastService);

    expect(toastService.toasts().map((t) => t.mensagem)).toContain('Você já faz parte de Engenharia de Software 🎓');
  });

  it('Story 2.3: não repete o toast de auto-join numa visita seguinte', async () => {
    localStorage.setItem('pacext.autojoin-toast.14', '1');
    const comunidadeCurso: Comunidade = {
      id: 14,
      nome: 'Engenharia de Software',
      descricao: null,
      tipo: 'CURSO',
      souMembro: true,
      souAdministrador: false,
      criadoEm: '2026-01-01T00:00:00Z',
    };
    await montar([comunidadeCurso]);
    const toastService = TestBed.inject(ToastService);

    expect(toastService.toasts()).toEqual([]);
  });

  describe('publicações na Home (KAN-93)', () => {
    it('mostra as publicações da comunidade do curso e a caixa de postar, sem o aviso "em breve"', async () => {
      await montar([comunidade(14, 'Engenharia de Software', 'CURSO')], [publicacao(1, 'Bem-vindos ao semestre!')]);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Publicações de Engenharia de Software');
      expect(compiled.textContent).toContain('Bem-vindos ao semestre!');
      expect(compiled.querySelector('textarea')).toBeTruthy();
      expect(compiled.textContent).not.toContain('chegam em breve');
    });

    it('prefere a comunidade de curso a uma aberta', async () => {
      await montar(
        [comunidade(30, 'Xadrez', 'ABERTA'), comunidade(14, 'Engenharia de Software', 'CURSO')],
        [publicacao(1, 'Post do curso')],
      );

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Publicações de Engenharia de Software');
    });

    it('sem comunidade de curso, usa a primeira de que participa', async () => {
      await montar([comunidade(30, 'Xadrez', 'ABERTA')], [publicacao(1, 'Post do xadrez', 30)]);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Publicações de Xadrez');
      expect(compiled.textContent).toContain('Post do xadrez');
    });

    it('sem nenhuma comunidade, convida a participar de uma e não busca publicações', async () => {
      await montar([]);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Você ainda não participa de nenhuma comunidade');
      expect(compiled.querySelector('app-feed-comunidade')).toBeNull();
    });

    it('falha ao carregar as publicações mostra o erro só no feed e mantém a descoberta', async () => {
      await TestBed.configureTestingModule({
        imports: [Feed],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      }).compileComponents();
      httpMock = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(Feed);
      fixture.detectChanges();
      httpMock.expectOne(`${API_BASE_URL}/usuarios/me`).flush({
        id: 1,
        nome: 'Julia Fontana',
        email: 'julia@catolicasc.edu.br',
        perfil: 'ALUNO',
        curso: 'Engenharia de Software',
      });
      httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([comunidade(14, 'Engenharia de Software', 'CURSO')]);
      httpMock.expectOne(`${API_BASE_URL}/avisos`).flush([]);
      httpMock
        .expectOne((req) => req.url === `${API_BASE_URL}/comunidades`)
        .flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0 });
      fixture.detectChanges();
      httpMock
        .expectOne((req) => req.url.endsWith('/publicacoes'))
        .flush({}, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Não foi possível carregar as postagens agora');
      expect(compiled.textContent).toContain('Descubra comunidades');
    });
  });

  describe('Esta semana: avisos institucionais (Story 13.2)', () => {
    function aviso(id: number, titulo: string, extra: Partial<Aviso> = {}): Aviso {
      return {
        id,
        titulo,
        mensagem: `Mensagem de ${titulo}`,
        escopo: 'GERAL',
        cursoId: null,
        cursoNome: null,
        dataDestaque: null,
        criadoEm: '2026-11-23T10:00:00Z',
        ...extra,
      };
    }

    it('mostra os avisos com o escopo e a data', async () => {
      await montar([], [], [
        aviso(1, 'Feriado'),
        aviso(2, 'Palestra', { escopo: 'CURSO', cursoId: 3, cursoNome: 'Engenharia de Software', dataDestaque: '2026-12-07' }),
      ]);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('#titulo-avisos-home')?.textContent).toBe('Esta semana');
      const itens = [...compiled.querySelectorAll('.home__aviso-item')].map((i) => i.textContent?.replace(/\s+/g, ' ').trim());
      expect(itens[0]).toContain('Feriado');
      expect(itens[0]).toContain('Todos os cursos · 23/11');
      expect(itens[1]).toContain('Palestra');
      expect(itens[1]).toContain('Engenharia de Software · 07/12');
    });

    it('sem avisos o bloco não aparece nem ocupa espaço', async () => {
      await montar([], [], []);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('#titulo-avisos-home')).toBeNull();
      expect(compiled.querySelector('.home__avisos')).toBeNull();
    });

    it('erro ao carregar os avisos esconde só o bloco e mantém a Home', async () => {
      await TestBed.configureTestingModule({
        imports: [Feed],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      }).compileComponents();
      httpMock = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(Feed);
      fixture.detectChanges();
      httpMock.expectOne(`${API_BASE_URL}/avisos`).flush({}, { status: 500, statusText: 'Server Error' });
      httpMock.expectOne(`${API_BASE_URL}/usuarios/me`).flush({
        id: 1, nome: 'Julia Fontana', email: 'julia@catolicasc.edu.br', perfil: 'ALUNO', curso: null,
      });
      httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([]);
      httpMock
        .expectOne((req) => req.url === `${API_BASE_URL}/comunidades`)
        .flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0 });
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('#titulo-avisos-home')).toBeNull();
      expect(compiled.textContent).toContain('Descubra comunidades');
    });
  });
});
