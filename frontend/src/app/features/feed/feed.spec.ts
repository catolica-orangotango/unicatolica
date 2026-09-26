import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
  async function montar(minhas: Comunidade[] = []): Promise<void> {
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
    // `expectOne(string)` casa contra a URL COM query string (urlWithParams) — esta
    // chamada sempre leva `?tipo=...&pagina=...&tamanho=...`, então precisa de um
    // predicado checando só `req.url` (sem params), não a forma de string solta.
    httpMock
      .expectOne((req) => req.url === `${API_BASE_URL}/comunidades`)
      .flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();
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
      criadoEm: '2026-01-01T00:00:00Z',
    };
    await montar([comunidadeCurso]);
    const toastService = TestBed.inject(ToastService);

    expect(toastService.toasts()).toEqual([]);
  });
});
