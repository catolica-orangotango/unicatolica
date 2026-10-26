import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { UsuarioAdmin } from '../admin.service';
import { Usuarios } from './usuarios';

const ADMIN_ID = 1;

function usuario(parcial: Partial<UsuarioAdmin> & Pick<UsuarioAdmin, 'id' | 'nomeCompleto'>): UsuarioAdmin {
  return {
    email: `${parcial.id}@catolicasc.edu.br`,
    curso: 'Administração',
    perfil: 'ALUNO',
    ativo: true,
    ...parcial,
  };
}

function pagina(content: UsuarioAdmin[], extra: Partial<{ page: number; totalPages: number }> = {}) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1, ...extra };
}

describe('Usuarios', () => {
  let fixture: ComponentFixture<Usuarios>;
  let httpMock: HttpTestingController;
  let html: HTMLElement;
  let toast: ToastService;

  const URL_LISTA = (r: { url: string }) => r.url === `${API_BASE_URL}/admin/usuarios`;

  async function montar(lista: UsuarioAdmin[], extra: Parameters<typeof pagina>[1] = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Usuarios],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { usuarioId: () => ADMIN_ID, obterCabecalhoAutorizacao: () => ({}) } },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    toast = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(Usuarios);
    fixture.detectChanges();
    httpMock.expectOne(URL_LISTA).flush(pagina(lista, extra));
    fixture.detectChanges();
    html = fixture.nativeElement as HTMLElement;
  }

  function botao(texto: string | RegExp): HTMLButtonElement {
    const encontrado = Array.from(html.querySelectorAll('button')).find((b) =>
      typeof texto === 'string' ? b.textContent?.trim() === texto : texto.test(b.getAttribute('aria-label') ?? b.textContent ?? ''),
    );
    if (!encontrado) throw new Error(`Botão não encontrado: ${texto}`);
    return encontrado as HTMLButtonElement;
  }

  afterEach(() => httpMock.verify());

  it('lista os usuários em uma tabela com perfil e situação em texto', async () => {
    await montar([
      usuario({ id: 2, nomeCompleto: 'Ana Aluna' }),
      usuario({ id: 3, nomeCompleto: 'Bia Bloqueada', perfil: 'MODERADOR', ativo: false, curso: null }),
    ]);

    const linhas = html.querySelectorAll('tbody tr');
    expect(linhas).toHaveLength(2);
    expect(linhas[0].textContent).toContain('Ana Aluna');
    expect(linhas[0].textContent).toContain('Aluno');
    expect(linhas[0].textContent).toContain('Ativa');
    expect(linhas[1].textContent).toContain('Moderador');
    expect(linhas[1].textContent).toContain('Desativada');
    expect(linhas[1].textContent).toContain('Sem curso');
    expect(html.querySelector('h1')?.textContent?.trim()).toBe('Usuários');
  });

  it('busca e filtro por perfil voltam para a primeira página', async () => {
    await montar([usuario({ id: 2, nomeCompleto: 'Ana Aluna' })]);

    (html.querySelector('#usuarios-busca') as HTMLInputElement).value = ' ana ';
    (html.querySelector('#usuarios-perfil') as HTMLSelectElement).value = 'MODERADOR';
    html.querySelector('form')!.dispatchEvent(new Event('submit'));

    const requisicao = httpMock.expectOne(URL_LISTA);
    expect(requisicao.request.params.get('busca')).toBe('ana');
    expect(requisicao.request.params.get('perfil')).toBe('MODERADOR');
    expect(requisicao.request.params.get('pagina')).toBe('0');
    requisicao.flush(pagina([]));
    fixture.detectChanges();

    expect(html.textContent).toContain('Nenhum usuário encontrado com esse filtro.');
  });

  it('pagina para a próxima página', async () => {
    await montar([usuario({ id: 2, nomeCompleto: 'Ana Aluna' })], { totalPages: 2 });

    expect(html.textContent).toContain('Página 1 de 2');
    botao(/Próxima/).click();

    const requisicao = httpMock.expectOne(URL_LISTA);
    expect(requisicao.request.params.get('pagina')).toBe('1');
    requisicao.flush(pagina([], { page: 1, totalPages: 2 }));
  });

  it('erro ao carregar mostra o aviso em role=alert', async () => {
    await TestBed.configureTestingModule({
      imports: [Usuarios],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { usuarioId: () => ADMIN_ID, obterCabecalhoAutorizacao: () => ({}) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Usuarios);
    fixture.detectChanges();
    httpMock.expectOne(URL_LISTA).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar');
  });

  it('a própria conta não tem ações', async () => {
    await montar([usuario({ id: ADMIN_ID, nomeCompleto: 'Eu Admin', perfil: 'ADMINISTRADOR' })]);

    expect(html.textContent).toContain('Esta é a sua conta');
    expect(html.querySelectorAll('tbody button')).toHaveLength(0);
  });

  it('alterar perfil pede confirmação, com o foco no botão, e só então chama a API', async () => {
    await montar([usuario({ id: 2, nomeCompleto: 'Ana Aluna' })]);
    const mostrar = vi.spyOn(toast, 'mostrar');

    botao('Alterar perfil').click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));

    httpMock.expectNone(`${API_BASE_URL}/admin/usuarios/2/perfil`);
    expect(html.textContent).toContain('Ana Aluna precisará entrar de novo.');
    expect(document.activeElement?.textContent?.trim()).toBe('Confirmar alteração');

    const select = html.querySelector('#perfil-novo-2') as HTMLSelectElement;
    select.value = 'MODERADOR';
    select.dispatchEvent(new Event('change'));
    botao('Confirmar alteração').click();

    const requisicao = httpMock.expectOne(`${API_BASE_URL}/admin/usuarios/2/perfil`);
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ perfil: 'MODERADOR' });
    requisicao.flush(usuario({ id: 2, nomeCompleto: 'Ana Aluna', perfil: 'MODERADOR' }));
    fixture.detectChanges();

    expect(html.querySelector('tbody tr')?.textContent).toContain('Moderador');
    expect(html.querySelector('[role="group"]')).toBeNull();
    expect(mostrar).toHaveBeenCalledWith('Perfil de Ana Aluna alterado para Moderador.');
  });

  it('cancelar a alteração de perfil não chama a API', async () => {
    await montar([usuario({ id: 2, nomeCompleto: 'Ana Aluna' })]);

    botao('Alterar perfil').click();
    fixture.detectChanges();
    botao('Cancelar').click();
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/admin/usuarios/2/perfil`);
    expect(html.querySelector('[role="group"]')).toBeNull();
  });

  it('desativar pede confirmação e a linha passa a mostrar Desativada, com Reativar', async () => {
    await montar([usuario({ id: 2, nomeCompleto: 'Ana Aluna' })]);
    const mostrar = vi.spyOn(toast, 'mostrar');

    botao(/Desativar conta de Ana Aluna/).click();
    fixture.detectChanges();
    httpMock.expectNone(`${API_BASE_URL}/admin/usuarios/2/ativo`);
    botao('Confirmar desativação').click();

    const requisicao = httpMock.expectOne(`${API_BASE_URL}/admin/usuarios/2/ativo`);
    expect(requisicao.request.body).toEqual({ ativo: false });
    requisicao.flush(usuario({ id: 2, nomeCompleto: 'Ana Aluna', ativo: false }));
    fixture.detectChanges();

    expect(html.querySelector('tbody tr')?.textContent).toContain('Desativada');
    expect(botao(/Reativar conta de Ana Aluna/)).toBeTruthy();
    expect(mostrar).toHaveBeenCalledWith('Conta de Ana Aluna desativada.');
  });

  it('reativar chama a API direto, sem confirmação', async () => {
    await montar([usuario({ id: 2, nomeCompleto: 'Ana Aluna', ativo: false })]);

    botao(/Reativar conta de Ana Aluna/).click();

    const requisicao = httpMock.expectOne(`${API_BASE_URL}/admin/usuarios/2/ativo`);
    expect(requisicao.request.body).toEqual({ ativo: true });
    requisicao.flush(usuario({ id: 2, nomeCompleto: 'Ana Aluna', ativo: true }));
    fixture.detectChanges();

    expect(html.querySelector('tbody tr')?.textContent).toContain('Ativa');
  });

  it('mostra a mensagem da API quando a alteração é recusada', async () => {
    await montar([usuario({ id: 2, nomeCompleto: 'Ana Aluna', perfil: 'ADMINISTRADOR' })]);

    botao(/Desativar conta de Ana Aluna/).click();
    fixture.detectChanges();
    botao('Confirmar desativação').click();
    httpMock.expectOne(`${API_BASE_URL}/admin/usuarios/2/ativo`).flush(
      { error: { code: 'ULTIMO_ADMINISTRADOR', message: 'A plataforma precisa de pelo menos um administrador ativo.', details: null } },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(html.querySelector('[role="alert"]')?.textContent).toContain('pelo menos um administrador ativo');
    expect(html.querySelector('tbody tr')?.textContent).toContain('Ativa');
  });
});
