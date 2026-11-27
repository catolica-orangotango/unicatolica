import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { NotificacoesService } from './notificacoes.service';

const PAGINA_VAZIA = { content: [], page: 0, size: 5, totalElements: 0, totalPages: 0, totalNaoLidas: 0 };

describe('NotificacoesService', () => {
  let service: NotificacoesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('pacext.token', 'token-fake');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificacoesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.pararConsultaPeriodica();
    httpMock.verify();
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('carregar / listar', () => {
    it('carregar() busca tamanho 5 por padrão, atualiza a cache do painel e o totalNaoLidas (RN04)', () => {
      service.carregar().subscribe();

      const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`);
      expect(req.request.params.get('pagina')).toBe('0');
      expect(req.request.params.get('tamanho')).toBe('5');
      req.flush({
        content: [{ id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'x', link: null, lida: false, criadoEm: '2026-01-01T00:00:00Z' }],
        page: 0,
        size: 5,
        totalElements: 1,
        totalPages: 1,
        totalNaoLidas: 7,
      });

      expect(service.notificacoes()).toHaveLength(1);
      expect(service.totalNaoLidas()).toBe(7);
    });

    it('listar(pagina, tamanho) não toca a cache do painel, mas atualiza o totalNaoLidas', () => {
      service.listar(1, 20).subscribe();

      const req = httpMock.expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`);
      expect(req.request.params.get('pagina')).toBe('1');
      expect(req.request.params.get('tamanho')).toBe('20');
      req.flush({ content: [], page: 1, size: 20, totalElements: 21, totalPages: 2, totalNaoLidas: 3 });

      expect(service.notificacoes()).toEqual([]);
      expect(service.totalNaoLidas()).toBe(3);
    });
  });

  describe('marcarComoLida', () => {
    it('marca o item como lido na cache e decrementa totalNaoLidas só se ele estava não lido', () => {
      service.carregar().subscribe();
      httpMock.expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`).flush({
        content: [
          { id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'a', link: null, lida: false, criadoEm: '2026-01-01T00:00:00Z' },
          { id: 2, tipo: 'ONBOARDING_PERFIL', texto: 'b', link: null, lida: true, criadoEm: '2026-01-02T00:00:00Z' },
        ],
        page: 0,
        size: 5,
        totalElements: 2,
        totalPages: 1,
        totalNaoLidas: 1,
      });

      service.marcarComoLida(2).subscribe();
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/2/lida`).flush(null);
      expect(service.totalNaoLidas()).toBe(1);
      expect(service.notificacoes().find((n) => n.id === 2)?.lida).toBe(true);

      service.marcarComoLida(1).subscribe();
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/1/lida`).flush(null);
      expect(service.totalNaoLidas()).toBe(0);
      expect(service.notificacoes().find((n) => n.id === 1)?.lida).toBe(true);
    });
  });

  describe('marcarTodasComoLidas', () => {
    it('zera o totalNaoLidas e marca tudo como lido na cache', () => {
      service.carregar().subscribe();
      httpMock.expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`).flush({
        content: [{ id: 1, tipo: 'ONBOARDING_PERFIL', texto: 'a', link: null, lida: false, criadoEm: '2026-01-01T00:00:00Z' }],
        page: 0,
        size: 5,
        totalElements: 1,
        totalPages: 1,
        totalNaoLidas: 1,
      });

      service.marcarTodasComoLidas().subscribe();
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/lidas`).flush(null);

      expect(service.totalNaoLidas()).toBe(0);
      expect(service.notificacoes().every((n) => n.lida)).toBe(true);
    });
  });

  describe('excluir', () => {
    it('remove da cache e decrementa totalNaoLidas quando era não lida', () => {
      service.carregar().subscribe();
      httpMock.expectOne((r) => r.url === `${API_BASE_URL}/notificacoes/me`).flush({
        content: [{ id: 9, tipo: 'ONBOARDING_PERFIL', texto: 'a', link: null, lida: false, criadoEm: '2026-01-01T00:00:00Z' }],
        page: 0,
        size: 5,
        totalElements: 1,
        totalPages: 1,
        totalNaoLidas: 1,
      });

      service.excluir(9).subscribe();
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/9`).flush(null);

      expect(service.notificacoes()).toEqual([]);
      expect(service.totalNaoLidas()).toBe(0);
    });

    it('trata 404 (já excluída/de outro usuário) como sucesso (RN10)', () => {
      let sucesso = false;
      service.excluir(999).subscribe({ next: () => (sucesso = true), error: () => undefined });

      httpMock
        .expectOne(`${API_BASE_URL}/notificacoes/999`)
        .flush({ error: { code: 'NOTIFICACAO_NAO_ENCONTRADA', message: 'x', details: null } }, { status: 404, statusText: 'Not Found' });

      expect(sucesso).toBe(true);
    });

    it('propaga erros diferentes de 404', () => {
      let erro: unknown;
      service.excluir(1).subscribe({ next: () => undefined, error: (e) => (erro = e) });

      httpMock.expectOne(`${API_BASE_URL}/notificacoes/1`).flush(null, { status: 500, statusText: 'Erro' });

      expect(erro).toBeTruthy();
    });
  });

  describe('consulta periódica (RF69.4, RN13, RN19-RN25)', () => {
    beforeEach(() => vi.useFakeTimers());

    function flushResumo(totalNaoLidas: number, ultimaNotificacaoId: number | null): void {
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush({ totalNaoLidas, ultimaNotificacaoId });
    }

    it('consulta na hora ao iniciar, e de novo a cada 10s em caso de sucesso', () => {
      service.iniciarConsultaPeriodica();
      flushResumo(0, null);

      httpMock.expectNone(`${API_BASE_URL}/notificacoes/me/resumo`);
      vi.advanceTimersByTime(10_000);
      flushResumo(0, null);
    });

    it('nunca duas consultas simultâneas: a próxima só é agendada depois da resposta', () => {
      service.iniciarConsultaPeriodica();
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`); // ainda não respondida

      vi.advanceTimersByTime(30_000);
      httpMock.expectNone(`${API_BASE_URL}/notificacoes/me/resumo`);
    });

    it('erro de rede faz backoff de 10s -> 20s -> 40s -> 60s, sem avisar o usuário (RN25)', () => {
      service.iniciarConsultaPeriodica();
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush(null, { status: 0, statusText: 'Erro de rede' });

      vi.advanceTimersByTime(9_999);
      httpMock.expectNone(`${API_BASE_URL}/notificacoes/me/resumo`);
      vi.advanceTimersByTime(1);
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush(null, { status: 500, statusText: 'Erro' });

      vi.advanceTimersByTime(19_999);
      httpMock.expectNone(`${API_BASE_URL}/notificacoes/me/resumo`);
      vi.advanceTimersByTime(1);
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush(null, { status: 500, statusText: 'Erro' });

      vi.advanceTimersByTime(40_000);
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush(null, { status: 500, statusText: 'Erro' });

      // Atingiu o máximo de 60s - não cresce mais.
      vi.advanceTimersByTime(60_000);
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush({ totalNaoLidas: 0, ultimaNotificacaoId: null });
    });

    it('depois de um sucesso, o atraso volta a 10s mesmo após erro anterior', () => {
      service.iniciarConsultaPeriodica();
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush(null, { status: 500, statusText: 'Erro' });

      vi.advanceTimersByTime(10_000);
      flushResumo(0, null); // sucesso: reseta o atraso para 10s

      vi.advanceTimersByTime(9_999);
      httpMock.expectNone(`${API_BASE_URL}/notificacoes/me/resumo`);
      vi.advanceTimersByTime(1);
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`);
    });

    it('pararConsultaPeriodica() cancela o próximo ciclo', () => {
      service.iniciarConsultaPeriodica();
      flushResumo(0, null);

      service.pararConsultaPeriodica();
      vi.advanceTimersByTime(60_000);
      httpMock.expectNone(`${API_BASE_URL}/notificacoes/me/resumo`);
    });

    it('pausa com a aba oculta e consulta na hora quando volta a ficar visível (RN22)', () => {
      service.iniciarConsultaPeriodica();
      flushResumo(0, null);

      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      vi.advanceTimersByTime(60_000);
      httpMock.expectNone(`${API_BASE_URL}/notificacoes/me/resumo`);

      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      document.dispatchEvent(new Event('visibilitychange'));
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush({ totalNaoLidas: 0, ultimaNotificacaoId: null });
    });

    it('totalNaoLidas aumentando dispara o anúncio acessível (RN26), sem mudar o foco', () => {
      service.iniciarConsultaPeriodica();
      flushResumo(0, null); // primeira resposta: nunca anuncia

      vi.advanceTimersByTime(10_000);
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush({ totalNaoLidas: 1, ultimaNotificacaoId: 5 });

      expect(service.anuncioAcessivel()).toBe('Você tem 1 notificação não lida.');
    });

    it('não anuncia na primeira resposta, mesmo com não lidas (evita ruído no login)', () => {
      service.iniciarConsultaPeriodica();
      flushResumo(3, 1);

      expect(service.anuncioAcessivel()).toBe('');
    });

    it('ultimaNotificacaoId diferente do conhecido emite notificacaoNova$ (RN20) - não na primeira resposta', () => {
      let emissoes = 0;
      service.notificacaoNova$.subscribe(() => emissoes++);

      service.iniciarConsultaPeriodica();
      flushResumo(0, 1);
      expect(emissoes).toBe(0);

      vi.advanceTimersByTime(10_000);
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush({ totalNaoLidas: 1, ultimaNotificacaoId: 2 });
      expect(emissoes).toBe(1);

      vi.advanceTimersByTime(10_000);
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush({ totalNaoLidas: 1, ultimaNotificacaoId: 2 });
      expect(emissoes).toBe(1); // mesmo id - não emite de novo
    });

    it('iniciarConsultaPeriodica() chamado de novo não duplica a consulta', () => {
      service.iniciarConsultaPeriodica();
      service.iniciarConsultaPeriodica();
      httpMock.expectOne(`${API_BASE_URL}/notificacoes/me/resumo`).flush({ totalNaoLidas: 0, ultimaNotificacaoId: null });
    });
  });
});
