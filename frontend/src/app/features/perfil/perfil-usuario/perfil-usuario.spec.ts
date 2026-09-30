import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { API_BASE_URL } from '../../../core/config/api.config';
import { PerfilUsuario } from './perfil-usuario';

describe('PerfilUsuario', () => {
  let httpMock: HttpTestingController;

  async function montar(id: string) {
    await TestBed.configureTestingModule({
      imports: [PerfilUsuario],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(PerfilUsuario);
  }

  afterEach(() => httpMock.verify());

  it('mostra o perfil de outro usuário somente leitura, sem botão de editar (Story 4.4)', async () => {
    const f = await montar('50');
    httpMock.expectOne(`${API_BASE_URL}/usuarios/50/perfil`).flush({
      usuarioId: 50,
      nome: 'Bruno Reis',
      curso: { id: 1, nome: 'Administração' },
      periodo: 5,
      interesses: ['Xadrez'],
    });
    f.detectChanges();

    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Bruno Reis');
    expect(el.querySelector('.cartao__avatar')?.textContent?.trim()).toBe('BR');
    expect(el.textContent).toContain('Administração');
    expect(el.textContent).toContain('5º semestre');
    expect(el.textContent).toContain('Xadrez');
    expect(el.querySelector('button')).toBeNull();
    expect(el.querySelector('form')).toBeNull();
  });

  it('usuário que ainda não completou o perfil aparece com "Não informado"', async () => {
    const f = await montar('51');
    httpMock
      .expectOne(`${API_BASE_URL}/usuarios/51/perfil`)
      .flush({ usuarioId: 51, nome: 'Carla', curso: null, periodo: null, interesses: [] });
    f.detectChanges();

    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Não informado');
    expect(el.textContent).toContain('Nenhum interesse ainda');
  });

  it('404 mostra que o usuário não existe', async () => {
    const f = await montar('999');
    httpMock
      .expectOne(`${API_BASE_URL}/usuarios/999/perfil`)
      .flush(
        { error: { code: 'USUARIO_NAO_ENCONTRADO', message: 'Usuário não encontrado.', details: null } },
        { status: 404, statusText: 'Not Found' },
      );
    f.detectChanges();

    expect((f.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
      'Esse usuário não existe',
    );
  });
});
