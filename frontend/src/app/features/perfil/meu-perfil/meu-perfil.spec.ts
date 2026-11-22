import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ToastService } from '../../../ui';
import { NotificacoesService } from '../../notificacoes/notificacoes.service';
import { MensagemFormatosAceitos } from '../../midia/midia.service';
import { Perfil } from '../perfil.service';
import { MeuPerfil } from './meu-perfil';

const CURSOS = [
  { id: 1, nome: 'Administração' },
  { id: 14, nome: 'Engenharia de Software' },
];

const SEM_PERFIL: Perfil = { usuarioId: 7, nome: 'Ana Lima', curso: null, periodo: null, interesses: [], fotoUrl: null };
const COM_PERFIL: Perfil = {
  usuarioId: 7,
  nome: 'Ana Lima',
  curso: { id: 14, nome: 'Engenharia de Software' },
  periodo: 3,
  interesses: ['Java', 'Robótica'],
  fotoUrl: null,
};

describe('MeuPerfil', () => {
  let fixture: ComponentFixture<MeuPerfil>;
  let httpMock: HttpTestingController;
  let toasts: string[];

  async function montar(perfil: Perfil): Promise<HTMLElement> {
    toasts = [];
    await TestBed.configureTestingModule({
      imports: [MeuPerfil],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: { mostrar: (m: string) => toasts.push(m) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MeuPerfil);
    httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush(perfil);
    httpMock.expectOne(`${API_BASE_URL}/cursos`).flush(CURSOS);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function escolher(el: HTMLElement, seletor: string, indice: number): void {
    const select = el.querySelector(seletor) as HTMLSelectElement;
    select.value = select.options[indice].value;
    select.dispatchEvent(new Event('change'));
  }

  function digitar(el: HTMLElement, seletor: string, texto: string): void {
    const input = el.querySelector(seletor) as HTMLInputElement;
    input.value = texto;
    input.dispatchEvent(new Event('input'));
  }

  function adicionar(el: HTMLElement, texto: string): void {
    digitar(el, '#novoInteresse', texto);
    (el.querySelector('.meu-perfil__novo-interesse button') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function interessesNaTela(el: HTMLElement): string[] {
    return [...el.querySelectorAll('.meu-perfil__interesse')].map((li) =>
      (li.firstChild?.textContent ?? '').trim(),
    );
  }

  afterEach(() => httpMock.verify());

  it('sem perfil acadêmico abre direto no formulário "Complete seu perfil", sem Cancelar', async () => {
    const el = await montar(SEM_PERFIL);

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Complete seu perfil');
    expect((el.querySelector('#nome') as HTMLInputElement).value).toBe('Ana Lima');
    expect(el.querySelector('.meu-perfil__acoes .botao-secundario')).toBeNull();
  });

  it('com perfil mostra o cartão com curso, período e interesses (Story 4.2)', async () => {
    const el = await montar(COM_PERFIL);

    expect(el.querySelector('app-perfil-cartao')).toBeTruthy();
    expect(el.textContent).toContain('Engenharia de Software');
    expect(el.textContent).toContain('3º semestre');
    expect([...el.querySelectorAll('.cartao__interesse')].map((li) => li.textContent?.trim())).toEqual([
      'Java',
      'Robótica',
    ]);
    expect(el.querySelector('form')).toBeNull();
  });

  it('salva o perfil com PUT, volta ao cartão e avisa com toast', async () => {
    const el = await montar(SEM_PERFIL);

    escolher(el, '#cursoId', 2);
    escolher(el, '#periodo', 3);
    adicionar(el, '  Banco   de dados ');
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    const req = httpMock.expectOne(`${API_BASE_URL}/perfil/me`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      nome: 'Ana Lima',
      cursoId: 14,
      periodo: 3,
      interesses: ['Banco de dados'],
    });
    req.flush({ ...COM_PERFIL, interesses: ['Banco de dados'] });
    // Trocou de curso (nenhum -> Engenharia): a sidebar recarrega as comunidades.
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([]);
    // Perfil completo pode marcar a notificação "complete seu perfil" como lida no
    // backend (Story 4.3) - o badge da sidebar recarrega pra não ficar preso no cache.
    // expectOne com string compara a URL inteira, com query string (?pagina=0&tamanho=20)
    // incluída - casa pelo path só via função de match.
    httpMock
      .expectOne((req) => req.url === `${API_BASE_URL}/notificacoes/me`)
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    fixture.detectChanges();

    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).toContain('Banco de dados');
    expect(toasts).toEqual(['Perfil salvo']);
  });

  it('salvar recarrega as notificações, pra o badge da sidebar não ficar com o cache antigo (defeito 2, Teste 08/10)', async () => {
    const el = await montar(COM_PERFIL);
    const notificacoesService = TestBed.inject(NotificacoesService);
    // Simula o estado real do bug: o painel já tinha sido aberto antes, com a
    // notificação ainda não lida no cache compartilhado (signal) do serviço.
    notificacoesService['_notificacoes'].set([
      { id: 1, tipo: 'PERFIL_INCOMPLETO', texto: 'Complete seu perfil', link: null, lida: false, criadoEm: '2026-10-08T00:00:00Z' },
    ]);
    expect(notificacoesService.naoLidas()).toBe(1);

    (el.querySelector('.meu-perfil__editar') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush(COM_PERFIL);
    // Mesmo curso: não recarrega /comunidades/minhas, só /notificacoes/me — o backend já
    // marcou a notificação como lida como efeito colateral do PUT /perfil/me.
    httpMock.expectOne((req) => req.url === `${API_BASE_URL}/notificacoes/me`).flush({
      content: [
        { id: 1, tipo: 'PERFIL_INCOMPLETO', texto: 'Complete seu perfil', link: null, lida: true, criadoEm: '2026-10-08T00:00:00Z' },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    expect(notificacoesService.naoLidas()).toBe(0);
  });

  it('campos obrigatórios vazios não enviam e anunciam o erro de cada um', async () => {
    const el = await montar(SEM_PERFIL);
    digitar(el, '#nome', '');

    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/perfil/me`);
    for (const campo of ['nome', 'cursoId', 'periodo']) {
      expect(el.querySelector(`#${campo}`)?.getAttribute('aria-invalid'), campo).toBe('true');
      expect(el.querySelector(`#erro-${campo}`), campo).toBeTruthy();
    }
  });

  it('interesse repetido (ignorando maiúsculas) não entra e avisa; remover tira da lista', async () => {
    const el = await montar(COM_PERFIL);
    (el.querySelector('.meu-perfil__editar') as HTMLButtonElement).click();
    fixture.detectChanges();

    adicionar(el, 'java');
    expect(interessesNaTela(el)).toEqual(['Java', 'Robótica']);
    expect(el.querySelector('[role="status"]')?.textContent).toContain('"java" já está na lista.');

    (el.querySelector('[aria-label="Remover Java"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(interessesNaTela(el)).toEqual(['Robótica']);
  });

  it('com 10 interesses o botão Adicionar fica desabilitado', async () => {
    const dez = Array.from({ length: 10 }, (_, i) => `Tema ${i + 1}`);
    const el = await montar({ ...COM_PERFIL, interesses: dez });
    (el.querySelector('.meu-perfil__editar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect((el.querySelector('.meu-perfil__novo-interesse button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('Cancelar descarta a edição e volta ao cartão sem salvar', async () => {
    const el = await montar(COM_PERFIL);
    (el.querySelector('.meu-perfil__editar') as HTMLButtonElement).click();
    fixture.detectChanges();
    digitar(el, '#nome', 'Outro Nome');

    (el.querySelector('.meu-perfil__acoes .botao-secundario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).toContain('Ana Lima');
  });

  it('422 da API mostra a mensagem dela; outro erro, mensagem genérica', async () => {
    const el = await montar(COM_PERFIL);
    (el.querySelector('.meu-perfil__editar') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    httpMock
      .expectOne(`${API_BASE_URL}/perfil/me`)
      .flush(
        { error: { code: 'CURSO_INVALIDO', message: 'Escolha um curso da lista.', details: 'cursoId' } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    fixture.detectChanges();
    expect(el.querySelector('.meu-perfil__erro')?.textContent).toContain('Escolha um curso da lista.');

    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(el.querySelector('.meu-perfil__erro')?.textContent).toContain('Não foi possível salvar seu perfil agora.');
  });

  it('curso atual desativado continua como opção do select', async () => {
    const el = await montar({ ...COM_PERFIL, curso: { id: 99, nome: 'Curso Antigo' } });
    (el.querySelector('.meu-perfil__editar') as HTMLButtonElement).click();
    fixture.detectChanges();

    const opcoes = [...(el.querySelector('#cursoId') as HTMLSelectElement).options].map((o) => o.textContent?.trim());
    expect(opcoes).toContain('Curso Antigo');
  });

  describe('foto de perfil (KAN-128)', () => {
    const COM_FOTO: Perfil = { ...COM_PERFIL, fotoUrl: 'https://s3.exemplo/foto.png' };

    function escolherFoto(el: HTMLElement, arquivo: File): void {
      const input = el.querySelector('input[type="file"]') as HTMLInputElement;
      // jsdom não tem DataTransfer: define `files` direto.
      Object.defineProperty(input, 'files', { value: [arquivo], configurable: true });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    }

    const botao = (el: HTMLElement, texto: string) =>
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);

    it('o seletor aceita só PNG e JPEG', async () => {
      const el = await montar(COM_PERFIL);
      expect((el.querySelector('input[type="file"]') as HTMLInputElement).accept).toBe('image/png,image/jpeg');
    });

    it('escolher imagem envia com finalidade FOTO_PERFIL e depois chama PUT /perfil/me/foto', async () => {
      const el = await montar(COM_PERFIL);

      escolherFoto(el, new File([new Uint8Array(10)], 'eu.png', { type: 'image/png' }));

      const upload = httpMock.expectOne(`${API_BASE_URL}/arquivos`);
      expect((upload.request.body as FormData).get('finalidade')).toBe('FOTO_PERFIL');
      upload.flush({ id: 9, nome: 'eu.png', tipo: 'image/png', tamanho: 10 });
      const put = httpMock.expectOne(`${API_BASE_URL}/perfil/me/foto`);
      expect(put.request.method).toBe('PUT');
      expect(put.request.body).toEqual({ arquivoId: 9 });
      put.flush(COM_FOTO);
      fixture.detectChanges();

      expect(el.querySelector('app-perfil-cartao img')?.getAttribute('src')).toBe('https://s3.exemplo/foto.png');
      expect(toasts).toEqual(['Foto atualizada']);
    });

    it('PDF é recusado no cliente, com os formatos aceitos, sem chamar a API', async () => {
      const el = await montar(COM_PERFIL);

      escolherFoto(el, new File([new Uint8Array(10)], 'edital.pdf', { type: 'application/pdf' }));

      expect(el.querySelector('.meu-perfil__erro[role="alert"]')?.textContent).toContain('PNG ou JPEG');
      expect(MensagemFormatosAceitos).toContain('PDF');
    });

    it('imagem acima de 2 MB é recusada no cliente', async () => {
      const el = await montar(COM_PERFIL);

      escolherFoto(el, new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }));

      expect(el.querySelector('.meu-perfil__erro[role="alert"]')?.textContent).toContain('2 MB');
    });

    it('"Remover foto" só aparece com foto', async () => {
      const el = await montar(COM_PERFIL);
      expect(botao(el, 'Remover foto')).toBeUndefined();
      expect(botao(el, 'Alterar foto')).toBeDefined();
    });

    it('"Remover foto" chama DELETE e devolve o foco a "Alterar foto"', async () => {
      const el = await montar(COM_FOTO);

      botao(el, 'Remover foto')!.click();
      const del = httpMock.expectOne(`${API_BASE_URL}/perfil/me/foto`);
      expect(del.request.method).toBe('DELETE');
      del.flush(COM_PERFIL);
      fixture.detectChanges();

      expect(botao(el, 'Remover foto')).toBeUndefined();
      expect(el.querySelector('app-perfil-cartao img')).toBeNull();
      expect(document.activeElement).toBe(botao(el, 'Alterar foto'));
    });

    it('falha no envio mostra erro em role=alert', async () => {
      const el = await montar(COM_PERFIL);

      escolherFoto(el, new File([new Uint8Array(10)], 'eu.png', { type: 'image/png' }));
      httpMock.expectOne(`${API_BASE_URL}/arquivos`).flush({}, { status: 500, statusText: 'Erro' });
      fixture.detectChanges();

      expect(el.querySelector('.meu-perfil__erro[role="alert"]')?.textContent).toContain('foto');
    });
  });
});

describe('MeuPerfil com erro ao carregar', () => {
  it('mostra alerta', async () => {
    await TestBed.configureTestingModule({
      imports: [MeuPerfil],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MeuPerfil);
    httpMock.expectOne(`${API_BASE_URL}/perfil/me`).flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${API_BASE_URL}/cursos`);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar seu perfil',
    );
  });
});
