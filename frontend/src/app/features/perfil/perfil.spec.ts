import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { API_BASE_URL } from '../../core/config/api.config';
import { Perfil } from './perfil';

describe('Perfil', () => {
  let fixture: ComponentFixture<Perfil>;
  let httpMock: HttpTestingController;

  async function montar(id: string | null): Promise<HTMLElement> {
    localStorage.setItem('pacext.token', 'token-fake');
    await TestBed.configureTestingModule({
      imports: [Perfil],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  const perfilAna = {
    usuarioId: 1,
    nome: 'Ana Paula',
    curso: 'Engenharia de Software',
    periodo: 3,
    interesses: ['IA', 'Robótica'],
  };

  describe('próprio perfil (/perfil, sem id)', () => {
    it('carrega e mostra o formulário preenchido', async () => {
      const el = await montar(null);
      httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush(perfilAna);
      fixture.detectChanges();

      expect(el.querySelector('h1')?.textContent).toContain('Meu perfil acadêmico');
      expect((el.querySelector('#perfil-nome') as HTMLInputElement).value).toBe('Ana Paula');
      expect((el.querySelector('#perfil-curso') as HTMLInputElement).value).toBe('Engenharia de Software');
      expect((el.querySelector('#perfil-periodo') as HTMLInputElement).value).toBe('3');
      expect(el.querySelectorAll('.perfil__interesse').length).toBe(2);
    });

    it('não salva com o nome vazio', async () => {
      const el = await montar(null);
      httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush(perfilAna);
      fixture.detectChanges();

      (el.querySelector('#perfil-nome') as HTMLInputElement).value = '';
      (el.querySelector('#perfil-nome') as HTMLInputElement).dispatchEvent(new Event('input'));
      (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      httpMock.expectNone(`${API_BASE_URL}/perfil/me`);
      expect(el.textContent).toContain('Informe seu nome.');
    });

    it('adiciona e remove interesses antes de salvar', async () => {
      const el = await montar(null);
      httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush({ ...perfilAna, interesses: [] });
      fixture.detectChanges();

      const campoNovo = el.querySelector('.perfil__interesse-novo input') as HTMLInputElement;
      campoNovo.value = 'Segurança';
      campoNovo.dispatchEvent(new Event('input'));
      (el.querySelector('.perfil__interesse-novo button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.perfil__interesse').length).toBe(1);

      (el.querySelector('.perfil__interesse-remover') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.perfil__interesse').length).toBe(0);
    });

    it('salva e mostra os dados devolvidos pelo backend', async () => {
      const el = await montar(null);
      httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush(perfilAna);
      fixture.detectChanges();

      (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const req = httpMock.expectOne(`${API_BASE_URL}/perfil/me`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({
        nome: 'Ana Paula',
        curso: 'Engenharia de Software',
        periodo: 3,
        interesses: ['IA', 'Robótica'],
      });
      req.flush(perfilAna);
      fixture.detectChanges();

      expect(el.querySelector('.perfil__erro')).toBeNull();
    });

    it('nome em uso por outra validação (erro do backend): mostra a mensagem recebida', async () => {
      const el = await montar(null);
      httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush(perfilAna);
      fixture.detectChanges();

      (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      httpMock
        .expectOne(`${API_BASE_URL}/perfil/me`)
        .flush(
          { error: { code: 'CAMPO_OBRIGATORIO', message: 'Informe seu nome.' } },
          { status: 422, statusText: 'Unprocessable Entity' },
        );
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('Informe seu nome.');
    });
  });

  describe('perfil de outro usuário (/perfil/:id)', () => {
    it('mostra só leitura, sem formulário', async () => {
      const el = await montar('7');
      httpMock.expectOne(`${API_BASE_URL}/perfil/7`).flush({ ...perfilAna, usuarioId: 7, nome: 'Beto' });
      fixture.detectChanges();

      expect(el.querySelector('h1')?.textContent).toContain('Beto');
      expect(el.querySelector('form')).toBeNull();
      expect(el.textContent).toContain('Engenharia de Software');
    });

    it('erro ao carregar mostra mensagem genérica', async () => {
      const el = await montar('999');
      httpMock.expectOne(`${API_BASE_URL}/perfil/999`).flush(null, { status: 404, statusText: 'Not Found' });
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar este perfil.');
    });
  });
});
