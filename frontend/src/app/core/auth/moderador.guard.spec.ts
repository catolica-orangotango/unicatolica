import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { moderadorGuard } from './moderador.guard';

describe('moderadorGuard', () => {
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
    return TestBed.runInInjectionContext(() => moderadorGuard({} as never, {} as never)) as boolean | UrlTree;
  }

  it('libera o MODERADOR', () => {
    perfis = ['MODERADOR'];

    expect(rodar()).toBe(true);
  });

  it('manda o aluno de volta para o Início', () => {
    perfis = ['ALUNO'];

    const resultado = rodar();

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/feed');
  });
});
