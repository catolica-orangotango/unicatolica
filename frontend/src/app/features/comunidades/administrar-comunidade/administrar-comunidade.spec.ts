import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Comunidade } from '../comunidades.service';
import { AdministrarComunidade } from './administrar-comunidade';

const COMUNIDADE: Comunidade = {
  id: 27,
  nome: 'Clube de Xadrez',
  descricao: 'Partidas às quintas',
  tipo: 'ABERTA',
  souMembro: true,
  souAdministrador: true,
  criadoEm: '2026-01-01T00:00:00Z',
};

const MEMBROS = [
  { usuarioId: 1, nome: 'Ana Admin', curso: 'Administração', papel: 'ADMINISTRADOR', membroDesde: '2026-01-01T00:00:00Z' },
  { usuarioId: 2, nome: 'Bruno Membro', curso: null, papel: 'MEMBRO', membroDesde: '2026-01-02T00:00:00Z' },
];

describe('AdministrarComunidade', () => {
  let fixture: ComponentFixture<AdministrarComunidade>;
  let httpMock: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdministrarComunidade],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdministrarComunidade);
    fixture.componentRef.setInput('comunidade', COMUNIDADE);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === `${API_BASE_URL}/comunidades/27/membros`)
      .flush({ content: MEMBROS, page: 0, size: 100, totalElements: 2, totalPages: 1 });
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => httpMock.verify());

  function botao(texto: string): HTMLButtonElement {
    const encontrado = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);
    if (!encontrado) throw new Error(`botão "${texto}" não encontrado`);
    return encontrado;
  }

  it('preenche o formulário com nome e descrição atuais', () => {
    expect((el.querySelector('#admin-nome') as HTMLInputElement).value).toBe('Clube de Xadrez');
    expect((el.querySelector('#admin-descricao') as HTMLTextAreaElement).value).toBe('Partidas às quintas');
  });

  it('salva só nome e descrição e emite a comunidade atualizada', () => {
    const emitidas: Comunidade[] = [];
    fixture.componentInstance.atualizada.subscribe((c) => emitidas.push(c));
    const nome = el.querySelector('#admin-nome') as HTMLInputElement;
    nome.value = '  Clube de Xadrez 2  ';
    nome.dispatchEvent(new Event('input'));

    botao('Salvar alterações').click();
    const req = httpMock.expectOne(`${API_BASE_URL}/comunidades/27`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ nome: 'Clube de Xadrez 2', descricao: 'Partidas às quintas' });
    req.flush({ ...COMUNIDADE, nome: 'Clube de Xadrez 2' });
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([]);

    expect(emitidas.map((c) => c.nome)).toEqual(['Clube de Xadrez 2']);
  });

  it('nome em branco não envia e mostra o erro ligado ao campo', () => {
    const nome = el.querySelector('#admin-nome') as HTMLInputElement;
    nome.value = '   ';
    nome.dispatchEvent(new Event('input'));

    botao('Salvar alterações').click();
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/comunidades/27`);
    expect(nome.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#erro-admin-nome')?.textContent?.trim()).toBe('Informe o nome da comunidade.');
  });

  it('mostra a mensagem da API quando o nome já está em uso', () => {
    botao('Salvar alterações').click();
    httpMock
      .expectOne(`${API_BASE_URL}/comunidades/27`)
      .flush(
        { error: { code: 'COMUNIDADE_NOME_EM_USO', message: 'Já existe uma comunidade com esse nome.' } },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe('Já existe uma comunidade com esse nome.');
  });

  it('lista os membros e só oferece Remover para membro comum', () => {
    const itens = Array.from(el.querySelectorAll('.admin__membro')).map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(itens[0]).toContain('Ana Admin');
    expect(itens[0]).toContain('Administrador · Administração');
    expect(itens[0]).not.toContain('Remover');
    expect(itens[1]).toContain('Bruno Membro');
    expect(el.querySelector('[aria-label="Remover Bruno Membro"]')).not.toBeNull();
  });

  it('remove membro só depois de confirmar', () => {
    (el.querySelector('[aria-label="Remover Bruno Membro"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    httpMock.expectNone(`${API_BASE_URL}/comunidades/27/membros/2`);
    expect(el.textContent).toContain('Remover Bruno Membro?');

    botao('Confirmar').click();
    const req = httpMock.expectOne(`${API_BASE_URL}/comunidades/27/membros/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(el.textContent).not.toContain('Bruno Membro');
  });

  it('cancelar a remoção volta ao botão Remover sem chamar a API', () => {
    (el.querySelector('[aria-label="Remover Bruno Membro"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    botao('Cancelar').click();
    fixture.detectChanges();

    httpMock.expectNone(`${API_BASE_URL}/comunidades/27/membros/2`);
    expect(el.querySelector('[aria-label="Remover Bruno Membro"]')).not.toBeNull();
  });

  it('exclui só depois de confirmar e emite excluida', () => {
    let excluida = false;
    fixture.componentInstance.excluida.subscribe(() => (excluida = true));

    botao('Excluir comunidade').click();
    fixture.detectChanges();
    httpMock.expectNone((r) => r.method === 'DELETE' && r.url === `${API_BASE_URL}/comunidades/27`);

    botao('Confirmar exclusão').click();
    const req = httpMock.expectOne((r) => r.method === 'DELETE' && r.url === `${API_BASE_URL}/comunidades/27`);
    req.flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne(`${API_BASE_URL}/comunidades/minhas`).flush([]);

    expect(excluida).toBe(true);
  });

  it('erro ao excluir mostra a mensagem e não emite excluida', () => {
    let excluida = false;
    fixture.componentInstance.excluida.subscribe(() => (excluida = true));

    botao('Excluir comunidade').click();
    fixture.detectChanges();
    botao('Confirmar exclusão').click();
    httpMock
      .expectOne((r) => r.method === 'DELETE' && r.url === `${API_BASE_URL}/comunidades/27`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(excluida).toBe(false);
    expect(el.textContent).toContain('Não foi possível concluir agora.');
  });
});
