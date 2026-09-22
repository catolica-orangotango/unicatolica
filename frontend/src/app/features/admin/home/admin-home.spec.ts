import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../../core/config/api.config';
import { AdminHome } from './admin-home';

describe('AdminHome (Dashboard geral)', () => {
  let fixture: ComponentFixture<AdminHome>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.setItem('pacext.token', 'token-fake');
    await TestBed.configureTestingModule({
      imports: [AdminHome],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminHome);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  const listagem = (tipo: string | null) => (req: { url: string; params: { get(k: string): string | null } }) =>
    req.url === `${API_BASE_URL}/comunidades` && req.params.get('tipo') === tipo;

  function responderTudo(): void {
    httpMock.expectOne(`${API_BASE_URL}/usuarios/me`).flush({
      id: 1,
      nome: 'Admin da Plataforma',
      email: 'admin@catolicasc.edu.br',
      perfil: 'ADMINISTRADOR',
      curso: null,
    });
    httpMock
      .expectOne(listagem(null))
      .flush({ content: [], page: 0, size: 1, totalElements: 30, totalPages: 30 });
    httpMock
      .expectOne(listagem('CURSO'))
      .flush({ content: [], page: 0, size: 1, totalElements: 26, totalPages: 26 });
    fixture.detectChanges();
  }

  it('mostra o dashboard com saudação e o total real de comunidades (curso + abertas)', () => {
    responderTudo();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Dashboard geral');
    expect(el.textContent).toContain('Olá, Admin da Plataforma');
    expect(el.querySelector('[data-testid="total-comunidades"]')?.textContent).toContain('30');
    expect(el.textContent).toContain('26 de curso · 4 abertas');
  });

  it('usuários, posts por dia e denúncias aparecem como "Em breve" (nada inventado)', () => {
    responderTudo();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.admin-home__em-breve').length).toBe(3);
    expect(el.textContent).toContain('Usuários cadastrados');
    expect(el.textContent).toContain('Posts criados por dia');
    expect(el.textContent).toContain('Denúncias dos usuários');
  });

  it('atividade recente aponta para a Central de relatórios e logs', () => {
    responderTudo();
    const link = (fixture.nativeElement as HTMLElement).querySelector('.admin-home__ver-logs');

    expect(link?.getAttribute('href')).toBe('/admin/relatorios');
  });

  it('se as chamadas falharem, o dashboard continua renderizando (sem travar)', () => {
    httpMock.expectOne(`${API_BASE_URL}/usuarios/me`).flush(null, { status: 500, statusText: 'Erro' });
    httpMock.expectOne(listagem(null)).flush(null, { status: 500, statusText: 'Erro' });
    httpMock.expectOne(listagem('CURSO')).flush(null, { status: 500, statusText: 'Erro' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent).toContain('Dashboard geral');
    expect(el.querySelector('[data-testid="total-comunidades"]')?.textContent).toContain('—');
  });
});
