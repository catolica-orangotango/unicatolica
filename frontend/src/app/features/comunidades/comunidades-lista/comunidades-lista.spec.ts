import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Pagina } from '../comunidades.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { ComunidadesLista } from './comunidades-lista';

describe('ComunidadesLista', () => {
  let fixture: ComponentFixture<ComunidadesLista>;
  let component: ComunidadesLista;
  let httpMock: HttpTestingController;

  const paginaUnica: Pagina<any> = {
    content: [
      { id: 1, nome: 'Engenharia de Software', descricao: null, tipo: 'CURSO', souMembro: null, criadoEm: '2026-01-01T00:00:00Z' },
      { id: 2, nome: 'Xadrez', descricao: 'Clube de xadrez', tipo: 'ABERTA', souMembro: null, criadoEm: '2026-01-02T00:00:00Z' },
    ],
    page: 0,
    size: 12,
    totalElements: 2,
    totalPages: 1,
  };

  /** Cria o componente e responde o GET inicial (`carregar()` do constructor). */
  async function montar(paginaFixture: Pagina<any>): Promise<void> {
    localStorage.setItem('pacext.token', 'token-fake');
    await TestBed.configureTestingModule({
      imports: [ComunidadesLista],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ComunidadesLista);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // O componente só faz o GET paginado — "minhas comunidades" é a cache
    // compartilhada do ComunidadesService (normalmente populada pelo Shell), que
    // parte vazia aqui porque não há Shell no teste desta tela isolada.
    httpMock.expectOne((req) => req.url === `${API_BASE_URL}/comunidades`).flush(paginaFixture);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('cria o componente e lista as comunidades carregadas', async () => {
    await montar(paginaUnica);

    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('.lista__card').length).toBe(2);
  });

  it('filtros têm nome acessível (WCAG 4.1.2)', async () => {
    await montar(paginaUnica);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input')?.getAttribute('aria-label')).toBe('Buscar comunidade por nome');
    expect(compiled.querySelector('select')?.getAttribute('aria-label')).toBe('Tipo de comunidade');
  });

  it('entra numa comunidade aberta e atualiza o estado sem recarregar tudo', async () => {
    await montar(paginaUnica);
    const compiled = fixture.nativeElement as HTMLElement;
    const botao = compiled.querySelector('.lista__botao-participar') as HTMLButtonElement;

    botao.click();

    httpMock.expectOne(`${API_BASE_URL}/comunidades/2/membros`).flush(null);
    // ComunidadesService.ingressar() recarrega a cache de "minhas comunidades"
    // antes de completar — é esse GET que precisa ser respondido aqui.
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([{ ...paginaUnica.content[1], souMembro: true }]);
    fixture.detectChanges();

    expect(compiled.querySelector('.lista__botao-sair')).toBeTruthy();
  });

  it('mostra o toast "Você entrou em {comunidade}" ao ingressar (Story 2.4)', async () => {
    await montar(paginaUnica);
    const toastService = TestBed.inject(ToastService);
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.lista__botao-participar') as HTMLButtonElement).click();
    httpMock.expectOne(`${API_BASE_URL}/comunidades/2/membros`).flush(null);
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([{ ...paginaUnica.content[1], souMembro: true }]);

    expect(toastService.toasts().map((t) => t.mensagem)).toContain('Você entrou em Xadrez');
  });

  describe('paginação (Story 2.5, RF28)', () => {
    const paginaMultipla: Pagina<any> = {
      content: [{ id: 1, nome: 'Administração', descricao: null, tipo: 'CURSO', souMembro: null, criadoEm: '2026-01-01T00:00:00Z' }],
      page: 0,
      size: 1,
      totalElements: 3,
      totalPages: 3,
    };

    it('mostra os controles e o texto "Página 1 de 3" quando há mais de uma página', async () => {
      await montar(paginaMultipla);
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.lista__paginacao')).toBeTruthy();
      expect(compiled.textContent).toContain('Página 1 de 3');
      expect((compiled.querySelector('.lista__paginacao button') as HTMLButtonElement).disabled).toBe(true); // "Anterior" na página 0
    });

    it('não mostra os controles quando só existe uma página', async () => {
      await montar(paginaUnica);
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.lista__paginacao')).toBeNull();
    });

    it('clicar em "Próxima" pede a página seguinte e atualiza a lista', async () => {
      await montar(paginaMultipla);
      const compiled = fixture.nativeElement as HTMLElement;

      const proxima = [...compiled.querySelectorAll('.lista__paginacao button')].find((b) =>
        (b.textContent ?? '').includes('Próxima'),
      ) as HTMLButtonElement;
      proxima.click();

      const requisicao = httpMock.expectOne(
        (req) => req.url === `${API_BASE_URL}/comunidades` && req.params.get('pagina') === '1',
      );
      requisicao.flush({
        content: [{ id: 2, nome: 'Biomedicina', descricao: null, tipo: 'CURSO', souMembro: null, criadoEm: '2026-01-01T00:00:00Z' }],
        page: 1,
        size: 1,
        totalElements: 3,
        totalPages: 3,
      });
      fixture.detectChanges();

      expect(compiled.textContent).toContain('Página 2 de 3');
      expect(compiled.textContent).toContain('Biomedicina');
    });
  });
});
