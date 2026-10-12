import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';

describe('adminGuard', () => {
  let perfis: string[];

  beforeEach(() => {
    perfis = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { possuiPerfil: (p: string) => perfis.includes(p) } },
      ],
    });
  });

  function rodar(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never)) as
      boolean | UrlTree;
  }

  it('libera o ADMINISTRADOR', () => {
    perfis = ['ADMINISTRADOR'];

    expect(rodar()).toBe(true);
  });

  it.each(['ALUNO', 'MODERADOR'])('manda %s de volta para o Início', (perfil) => {
    perfis = [perfil];

    const resultado = rodar();

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/feed');
  });
});
