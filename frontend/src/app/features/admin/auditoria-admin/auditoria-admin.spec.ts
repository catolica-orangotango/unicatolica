import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { FiltrosAuditoria, LogAuditoria } from '../auditoria.service';
import { AuditoriaAdmin } from './auditoria-admin';

const URL_LISTA = `${API_BASE_URL}/admin/auditoria`;
const URL_FILTROS = `${API_BASE_URL}/admin/auditoria/filtros`;

const FILTROS: FiltrosAuditoria = {
  modulos: ['comunidades', 'identidade'],
  acoesPorModulo: { comunidades: ['COMUNIDADE_CRIADA'], identidade: ['LOGIN', 'PERFIL_ALTERADO'] },
  entidadesAfetadas: ['Comunidade', 'Usuario'],
};

function log(parcial: Partial<LogAuditoria> & Pick<LogAuditoria, 'id'>): LogAuditoria {
  return {
    criadoEm: '2026-03-10T02:30:00Z',
    autor: { id: 1, nome: 'Admin Teste', email: 'admin@catolicasc.edu.br' },
    modulo: 'identidade',
    acao: 'PERFIL_ALTERADO',
    entidadeAfetada: 'Usuario',
    entidadeId: 7,
    detalhes: 'ALUNO -> MODERADOR',
    ...parcial,
  };
}

function pagina(content: LogAuditoria[], extra: Partial<{ page: number; totalPages: number; totalElements: number }> = {}) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1, ...extra };
}

describe('AuditoriaAdmin', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let html: HTMLElement;
  let harness: RouterTestingHarness;

  const ehLista = (r: { url: string }) => r.url === URL_LISTA;

  async function abrir(url = '/admin/auditoria'): Promise<void> {
    localStorage.setItem('pacext.token', 'token-fake');
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/auditoria', component: AuditoriaAdmin }]),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, AuditoriaAdmin);
    html = harness.routeNativeElement as HTMLElement;
    httpMock.expectOne(URL_FILTROS).flush(FILTROS);
  }

  function responder(conteudo: LogAuditoria[], extra: Parameters<typeof pagina>[1] = {}) {
    const req = httpMock.expectOne(ehLista);
    req.flush(pagina(conteudo, extra));
    harness.detectChanges();
    return req;
  }

  function botao(texto: string): HTMLButtonElement {
    const encontrado = Array.from(html.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);
    if (!encontrado) throw new Error(`Botão não encontrado: ${texto}`);
    return encontrado;
  }

  function campo(rotulo: string): HTMLInputElement | HTMLSelectElement {
    const label = Array.from(html.querySelectorAll('label')).find((l) => l.textContent?.trim() === rotulo);
    if (!label) throw new Error(`Campo não encontrado: ${rotulo}`);
    return html.querySelector(`#${label.getAttribute('for')}`) as HTMLInputElement | HTMLSelectElement;
  }

  function escolher(rotulo: string, valor: string) {
    const el = campo(rotulo);
    el.value = valor;
    el.dispatchEvent(new Event('change'));
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('lista os registros com data de Brasília, autor, entidade e detalhes em texto', async () => {
    await abrir();
    const req = responder([log({ id: 2 }), log({ id: 1, autor: null, entidadeAfetada: null, entidadeId: null, detalhes: null })]);

    expect(req.request.headers.get('Authorization')).toBe('Bearer token-fake');
    expect(req.request.params.get('pagina')).toBe('0');
    expect(req.request.params.get('tamanho')).toBe('20');
    const linhas = html.querySelectorAll('tbody tr');
    expect(linhas).toHaveLength(2);
    expect(linhas[0].textContent).toContain('09/03/2026 23:30:00');
    expect(linhas[0].textContent).toContain('Admin Teste');
    expect(linhas[0].textContent).toContain('admin@catolicasc.edu.br');
    expect(linhas[0].textContent).toContain('Usuario #7');
    expect(linhas[0].textContent).toContain('ALUNO -> MODERADOR');
    expect(linhas[1].textContent).toContain('Sistema');
    expect(html.querySelector('[role="status"]')?.textContent).toContain('2 registros encontrados');
  });

  it('usuário que não existe mais aparece como "Usuário #id"', async () => {
    await abrir();
    responder([log({ id: 1, autor: { id: 99, nome: null, email: null } })]);

    expect(html.querySelector('tbody')?.textContent).toContain('Usuário #99');
  });

  it('mostra o detalhes como texto puro, sem interpretar HTML', async () => {
    await abrir();
    responder([log({ id: 1, detalhes: '<img src=x onerror=alert(1)>' })]);

    expect(html.querySelector('tbody img')).toBeNull();
    expect(html.querySelector('tbody')?.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('lê os filtros e a página da URL (página 1-based na URL, 0-based na API)', async () => {
    await abrir('/admin/auditoria?modulo=identidade&acao=PERFIL_ALTERADO&detalhes=MOD&de=2026-03-01&pagina=3');
    const req = responder([log({ id: 1 })], { page: 2, totalPages: 3, totalElements: 41 });

    expect(req.request.params.get('modulo')).toBe('identidade');
    expect(req.request.params.get('acao')).toBe('PERFIL_ALTERADO');
    expect(req.request.params.get('detalhes')).toBe('MOD');
    expect(req.request.params.get('de')).toBe('2026-03-01');
    expect(req.request.params.get('pagina')).toBe('2');
    expect((campo('Módulo') as HTMLSelectElement).value).toBe('identidade');
    expect((campo('Ação') as HTMLSelectElement).value).toBe('PERFIL_ALTERADO');
    expect(html.querySelector('.auditoria__paginacao')?.textContent).toContain('Página 3 de 3');
  });

  it('mudar o módulo atualiza a URL e volta para a página 1, sem botão "Buscar"', async () => {
    await abrir('/admin/auditoria?pagina=2');
    responder([log({ id: 1 })], { page: 1, totalPages: 2 });

    escolher('Módulo', 'identidade');
    await harness.fixture.whenStable();

    expect(router.url).toBe('/admin/auditoria?modulo=identidade');
    const req = responder([log({ id: 1 })]);
    expect(req.request.params.get('modulo')).toBe('identidade');
    expect(req.request.params.get('pagina')).toBe('0');
    expect(Array.from(html.querySelectorAll('button')).some((b) => /buscar/i.test(b.textContent ?? ''))).toBe(false);
  });

  it('a lista de ações mostra só as do módulo escolhido e descarta ação de outro módulo', async () => {
    await abrir('/admin/auditoria?modulo=identidade&acao=LOGIN');
    responder([log({ id: 1 })]);
    const opcoesAcao = () => Array.from((campo('Ação') as HTMLSelectElement).options).map((o) => o.value);
    expect(opcoesAcao()).toEqual(['', 'LOGIN', 'PERFIL_ALTERADO']);

    escolher('Módulo', 'comunidades');
    await harness.fixture.whenStable();

    expect(router.url).toBe('/admin/auditoria?modulo=comunidades');
    responder([]);
    expect(opcoesAcao()).toEqual(['', 'COMUNIDADE_CRIADA']);
  });

  it('o texto de detalhes espera 300 ms depois da última tecla e só filtra a partir de 3 letras', async () => {
    await abrir();
    responder([log({ id: 1 })]);
    const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const detalhes = campo('Detalhes contêm') as HTMLInputElement;

    detalhes.value = 'MO';
    detalhes.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(html.textContent).toContain('Digite ao menos 3 letras');
    await esperar(400);
    expect(router.url).toBe('/admin/auditoria');

    detalhes.value = 'MOD';
    detalhes.dispatchEvent(new Event('input'));
    await esperar(100);
    expect(router.url).toBe('/admin/auditoria');
    await esperar(300);
    await harness.fixture.whenStable();

    expect(router.url).toBe('/admin/auditoria?detalhes=MOD');
    responder([log({ id: 1 })]);
  });

  it('de depois de até mostra o erro no campo e não consulta', async () => {
    await abrir('/admin/auditoria?de=2026-03-10&ate=2026-03-09');
    harness.detectChanges();

    httpMock.expectNone(ehLista);
    expect(html.textContent).toContain('A data inicial não pode ser depois da data final.');
    expect(campo('Até').getAttribute('aria-invalid')).toBe('true');
  });

  it('"Limpar filtros" zera a URL e consulta a lista completa', async () => {
    await abrir('/admin/auditoria?modulo=identidade&detalhes=MOD&pagina=2');
    responder([log({ id: 1 })], { page: 1, totalPages: 2 });

    botao('Limpar filtros').click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/admin/auditoria');
    const req = responder([log({ id: 1 })]);
    expect(req.request.params.has('modulo')).toBe(false);
    expect(req.request.params.has('detalhes')).toBe(false);
    expect((campo('Detalhes contêm') as HTMLInputElement).value).toBe('');
  });

  it('paginação: próxima e anterior navegam e mostram "página X de N"', async () => {
    await abrir();
    responder([log({ id: 1 })], { totalPages: 3, totalElements: 50 });
    expect(html.querySelector('.auditoria__paginacao')?.textContent).toContain('Página 1 de 3');
    expect(botao('← Anterior').disabled).toBe(true);

    botao('Próxima →').click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/admin/auditoria?pagina=2');
    const req = responder([log({ id: 2 })], { page: 1, totalPages: 3, totalElements: 50 });
    expect(req.request.params.get('pagina')).toBe('1');
    expect(html.querySelector('.auditoria__paginacao')?.textContent).toContain('Página 2 de 3');
  });

  it('sem nenhum log mostra o estado vazio, sem "Limpar filtros"', async () => {
    await abrir();
    responder([]);

    expect(html.textContent).toContain('Nenhum log registrado ainda');
    expect(html.querySelector('uc-empty-state button')).toBeNull();
  });

  it('nenhum log para os filtros mostra o estado vazio com "Limpar filtros"', async () => {
    await abrir('/admin/auditoria?modulo=identidade');
    responder([]);

    expect(html.textContent).toContain('Nenhum log para esses filtros');
    expect(html.querySelector('uc-empty-state button')?.textContent?.trim()).toBe('Limpar filtros');
  });

  it('mostra o esqueleto enquanto carrega', async () => {
    await abrir();

    expect(html.querySelectorAll('uc-skeleton').length).toBeGreaterThan(0);
    expect(html.querySelector('[aria-busy="true"]')).not.toBeNull();
    responder([]);
  });

  it('erro de carga mostra aviso com "Tentar de novo", que consulta outra vez', async () => {
    await abrir();
    httpMock.expectOne(ehLista).flush({ error: { code: 'ERRO_INTERNO' } }, { status: 500, statusText: 'Erro' });
    harness.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar os logs');

    botao('Tentar de novo').click();
    responder([log({ id: 1 })]);

    expect(html.querySelector('[role="alert"]')).toBeNull();
    expect(html.querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('403 mostra que não há acesso', async () => {
    await abrir();
    httpMock.expectOne(ehLista).flush({ error: { code: 'ACESSO_NEGADO' } }, { status: 403, statusText: 'Proibido' });
    harness.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain('Você não tem acesso');
  });
});
