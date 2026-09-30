import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ComunidadeDetalhe } from './comunidade-detalhe';

describe('ComunidadeDetalhe', () => {
  let fixture: ComponentFixture<ComunidadeDetalhe>;
  let httpMock: HttpTestingController;

  async function montar(id: string): Promise<ComponentFixture<ComunidadeDetalhe>> {
    await TestBed.configureTestingModule({
      imports: [ComunidadeDetalhe],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const criado = TestBed.createComponent(ComunidadeDetalhe);
    criado.detectChanges();
    fixture = criado;
    return criado;
  }

  /** A tela embute o `FeedComunidade`, que busca as postagens assim que a comunidade aparece. */
  function responderFeed(id: number): void {
    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/comunidades/${id}/publicacoes`)
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  }

  afterEach(() => httpMock.verify());

  it('mostra o cabeçalho com nome, tipo e botão Participar pra comunidade aberta sem membro', async () => {
    const f = await montar('27');

    httpMock.expectOne(`${API_BASE_URL}/comunidades/27`).flush({
      id: 27,
      nome: 'Clube de Xadrez',
      descricao: null,
      tipo: 'ABERTA',
      souMembro: false,
      criadoEm: '2026-01-01T00:00:00Z',
    });
    f.detectChanges();
    responderFeed(27);
    f.detectChanges();

    const compiled = f.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Clube de Xadrez');
    expect(compiled.textContent).toContain('Comunidade aberta');
    expect(compiled.querySelector('.detalhe__acao [uc-button]')?.textContent?.trim()).toBe('Participar');
  });

  it('comunidade de curso com membro: mostra indicador de membro, sem botão de ação', async () => {
    const f = await montar('14');

    httpMock.expectOne(`${API_BASE_URL}/comunidades/14`).flush({
      id: 14,
      nome: 'Engenharia de Software',
      descricao: null,
      tipo: 'CURSO',
      souMembro: true,
      criadoEm: '2026-01-01T00:00:00Z',
    });
    f.detectChanges();
    responderFeed(14);
    f.detectChanges();

    const compiled = f.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('associação automática');
    expect(compiled.querySelector('uc-member-indicator')).toBeTruthy();
    expect(compiled.querySelector('.detalhe__acao [uc-button]')).toBeNull();
    expect(compiled.querySelector('.detalhe__botao-sair')).toBeNull();
  });

  it('sai de uma comunidade aberta e atualiza o cabeçalho pra "Participar"', async () => {
    const f = await montar('27');

    httpMock.expectOne(`${API_BASE_URL}/comunidades/27`).flush({
      id: 27,
      nome: 'Clube de Xadrez',
      descricao: null,
      tipo: 'ABERTA',
      souMembro: true,
      criadoEm: '2026-01-01T00:00:00Z',
    });
    f.detectChanges();
    responderFeed(27);
    f.detectChanges();

    const compiled = f.nativeElement as HTMLElement;
    (compiled.querySelector('.detalhe__botao-sair') as HTMLButtonElement).click();

    httpMock.expectOne(`${API_BASE_URL}/comunidades/27/membros/me`).flush(null);
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([]);
    f.detectChanges();

    expect(compiled.querySelector('.detalhe__acao [uc-button]')?.textContent?.trim()).toBe('Participar');
  });

  it('membro vê a caixa de postar; ao sair, ela vira o aviso sem recarregar o feed', async () => {
    const f = await montar('27');

    httpMock.expectOne(`${API_BASE_URL}/comunidades/27`).flush({
      id: 27,
      nome: 'Clube de Xadrez',
      descricao: null,
      tipo: 'ABERTA',
      souMembro: true,
      criadoEm: '2026-01-01T00:00:00Z',
    });
    f.detectChanges();
    responderFeed(27);
    f.detectChanges();

    const compiled = f.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-feed-comunidade textarea')).toBeTruthy();

    (compiled.querySelector('.detalhe__botao-sair') as HTMLButtonElement).click();
    httpMock.expectOne(`${API_BASE_URL}/comunidades/27/membros/me`).flush(null);
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([]);
    f.detectChanges();

    expect(compiled.querySelector('app-feed-comunidade textarea')).toBeNull();
    expect(compiled.textContent).toContain('Participe da comunidade para publicar.');
  });

  it('erro ao carregar mostra mensagem amigável', async () => {
    const f = await montar('999');

    httpMock.expectOne(`${API_BASE_URL}/comunidades/999`).flush(
      { error: { code: 'COMUNIDADE_NAO_ENCONTRADA', message: 'Não encontrada.', details: null } },
      { status: 404, statusText: 'Not Found' },
    );
    f.detectChanges();

    expect((f.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeTruthy();
  });
});

// jsdom does not compute styles from an external stylesheet, so this screen's
// one dark context is pinned to the SCSS source, as badge.spec.ts pins its own.
// Story 14.7 restyled `.detalhe__botao-sair` (it used to be a pair of
// rgba(255,255,255,...) literals) and added the focus override the global ring
// cannot provide here; both are visible changes, so both get an assertion.
describe('comunidade-detalhe.scss style contract', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  // Comments are stripped first: this file's own header NAMES the rgba() pair it
  // replaced, and a prose mention must not read as a live declaration.
  const scss = readFileSync(join(dir, 'comunidade-detalhe.scss'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const regra = (selector: string): string =>
    scss.replace(/\s+/g, ' ').match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

  it('the "Sair" button reads as an outline on the maroon band, with no alpha literal', () => {
    const botao = regra('.detalhe__botao-sair');
    expect(botao).toContain('border: 1px solid var(--uc-color-surface)');
    expect(botao).toContain('background: transparent');
    expect(botao).toContain('color: var(--uc-color-surface)');
    expect(scss).not.toMatch(/rgba?\(/);
  });

  it('overrides the global maroon focus ring, which would be invisible on the band', () => {
    // Global ring: 2px solid var(--uc-color-maroon) in styles/_base.scss. On the
    // maroon header band that is 1.00:1; `surface` gives 10.20:1.
    const foco = regra('.detalhe__botao-sair:focus-visible');
    expect(foco, 'no :focus-visible override on the button over the maroon band').not.toBe('');
    expect(foco).toContain('outline: 2px solid var(--uc-color-surface)');
    expect(foco).toContain('outline-offset: 2px');
    expect(foco).not.toContain('var(--uc-color-maroon)');
  });
});
