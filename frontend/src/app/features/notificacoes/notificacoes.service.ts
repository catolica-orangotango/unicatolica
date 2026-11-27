import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, catchError, map, of, tap, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';

/** Espelha `NotificacaoResponse` do backend (Story 10.1). */
export interface Notificacao {
  id: number;
  tipo: string;
  texto: string;
  link: string | null;
  lida: boolean;
  criadoEm: string;
}

/** Espelha `PageResponse<T>` do backend (AD-4). */
export interface Pagina<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Espelha `NotificacaoPageResponse` do backend (Story 10.2, RN04): `totalNaoLidas` nunca é da página. */
export type PaginaNotificacoes = Pagina<Notificacao> & { totalNaoLidas: number };

/** Espelha `NotificacaoResumoResponse` do backend (Story 10.2, RF69.4). */
export interface ResumoNotificacoes {
  totalNaoLidas: number;
  ultimaNotificacaoId: number | null;
}

/** Atraso inicial e máximo (backoff) da consulta periódica (Story 10.2, RN25), em ms. */
const ATRASO_INICIAL_MS = 10_000;
const ATRASO_MAXIMO_MS = 60_000;

/**
 * Sininho de notificações da shell (Story 10.1/10.2, RF20.1, RF68, RF69, RF84). `notificacoes`
 * é a cache compartilhada (signal) do painel (5 mais recentes) e `totalNaoLidas` o contador do
 * badge - sempre o valor do backend (RN04), nunca contado sobre a página carregada. A página
 * `/notificacoes` mantém sua própria lista a partir do `Observable` de {@link listar}, sem usar
 * a cache do painel.
 */
@Injectable({ providedIn: 'root' })
export class NotificacoesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly _notificacoes = signal<Notificacao[]>([]);
  readonly notificacoes = this._notificacoes.asReadonly();

  private readonly _totalNaoLidas = signal(0);
  readonly totalNaoLidas = this._totalNaoLidas.asReadonly();

  /** Mensagem da região `aria-live` da casca (RN26) - texto novo a cada aumento, mesmo repetido. */
  private readonly _anuncioAcessivel = signal('');
  readonly anuncioAcessivel = this._anuncioAcessivel.asReadonly();

  /**
   * Emite quando o resumo periódico detecta um id mais recente diferente do conhecido (RN20).
   * Quem tem uma lista aberta (painel na {@link Shell}, página `/notificacoes`) assina e
   * recarrega a própria visão, na própria página/tamanho - o serviço não decide isso por eles.
   */
  private readonly _notificacaoNova = new Subject<void>();
  readonly notificacaoNova$ = this._notificacaoNova.asObservable();

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollAtivo = false;
  private pollEmAndamento = false;
  private pollRecebeuPrimeiraResposta = false;
  private pollAtrasoMs = ATRASO_INICIAL_MS;
  private ultimaNotificacaoIdConhecida: number | null = null;
  private readonly aoFicarVisivel = (): void => {
    if (document.visibilityState === 'visible' && this.pollAtivo) {
      this.cancelarTimer();
      this.consultarResumo();
    }
  };

  /** `GET /notificacoes/me` - busca do zero e atualiza a cache compartilhada do painel. */
  carregar(pagina = 0, tamanho = 5): Observable<PaginaNotificacoes> {
    return this.buscarPagina(pagina, tamanho).pipe(
      tap((resultado) => {
        this._notificacoes.set(resultado.content);
        this.atualizarTotalEUltimaId(resultado);
      }),
    );
  }

  /** `GET /notificacoes/me` para a página `/notificacoes` - não toca a cache do painel. */
  listar(pagina: number, tamanho = 20): Observable<PaginaNotificacoes> {
    return this.buscarPagina(pagina, tamanho).pipe(tap((resultado) => this.atualizarTotalEUltimaId(resultado)));
  }

  /**
   * `POST /notificacoes/{id}/lida` - atualiza a cache local otimisticamente (sem esperar
   * recarregar a lista inteira), já que é só um clique num item do painel.
   */
  marcarComoLida(id: number): Observable<void> {
    return this.http
      .post<void>(`${API_BASE_URL}/notificacoes/${id}/lida`, null, {
        headers: this.authService.obterCabecalhoAutorizacao(),
      })
      .pipe(
        tap(() => {
          let eraNaoLida = false;
          this._notificacoes.update((lista) =>
            lista.map((n) => {
              if (n.id === id && !n.lida) eraNaoLida = true;
              return n.id === id ? { ...n, lida: true } : n;
            }),
          );
          if (eraNaoLida) this._totalNaoLidas.update((total) => Math.max(0, total - 1));
        }),
        map(() => undefined),
      );
  }

  /** `POST /notificacoes/me/lidas` (Story 10.2, RF68.2, RN07). */
  marcarTodasComoLidas(): Observable<void> {
    return this.http
      .post<void>(`${API_BASE_URL}/notificacoes/me/lidas`, null, {
        headers: this.authService.obterCabecalhoAutorizacao(),
      })
      .pipe(
        tap(() => {
          this._notificacoes.update((lista) => lista.map((n) => ({ ...n, lida: true })));
          this._totalNaoLidas.set(0);
        }),
        map(() => undefined),
      );
  }

  /** `DELETE /notificacoes/{id}` (Story 10.2, RF84). 404 (já excluída/de outro usuário) conta como sucesso (RN10). */
  excluir(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API_BASE_URL}/notificacoes/${id}`, {
        headers: this.authService.obterCabecalhoAutorizacao(),
      })
      .pipe(
        catchError((erro: unknown) =>
          erro instanceof HttpErrorResponse && erro.status === 404 ? of(undefined) : throwError(() => erro),
        ),
        tap(() => {
          let eraNaoLida = false;
          this._notificacoes.update((lista) =>
            lista.filter((n) => {
              if (n.id === id && !n.lida) eraNaoLida = true;
              return n.id !== id;
            }),
          );
          if (eraNaoLida) this._totalNaoLidas.update((total) => Math.max(0, total - 1));
        }),
        map(() => undefined),
      );
  }

  /**
   * Começa a consulta periódica de 10 s (RF69.4, RN13, RN19-RN25). Chamado pela casca
   * autenticada (`Shell`); parar junto com ela (logout, 401, destruição) evita chamada órfã.
   */
  iniciarConsultaPeriodica(): void {
    if (this.pollAtivo) return;
    this.pollAtivo = true;
    this.pollAtrasoMs = ATRASO_INICIAL_MS;
    document.addEventListener('visibilitychange', this.aoFicarVisivel);
    this.consultarResumo();
  }

  pararConsultaPeriodica(): void {
    this.pollAtivo = false;
    this.cancelarTimer();
    document.removeEventListener('visibilitychange', this.aoFicarVisivel);
  }

  private buscarPagina(pagina: number, tamanho: number): Observable<PaginaNotificacoes> {
    return this.http.get<PaginaNotificacoes>(`${API_BASE_URL}/notificacoes/me`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
      params: { pagina: String(pagina), tamanho: String(tamanho) },
    });
  }

  private atualizarTotalEUltimaId(resultado: PaginaNotificacoes): void {
    this._totalNaoLidas.set(resultado.totalNaoLidas);
    if (resultado.page === 0 && resultado.content.length > 0) {
      this.ultimaNotificacaoIdConhecida = resultado.content[0].id;
    }
  }

  private cancelarTimer(): void {
    if (this.pollTimer !== null) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private consultarResumo(): void {
    if (!this.pollAtivo || document.visibilityState === 'hidden' || this.pollEmAndamento) {
      return;
    }
    this.pollEmAndamento = true;
    this.http
      .get<ResumoNotificacoes>(`${API_BASE_URL}/notificacoes/me/resumo`, {
        headers: this.authService.obterCabecalhoAutorizacao(),
      })
      .subscribe({
        next: (resumo) => this.aoResumoChegar(resumo),
        error: () => {
          this.pollEmAndamento = false;
          // RN25: a próxima tentativa usa o atraso atual (10s na 1ª falha); só
          // depois de agendar é que ele dobra, para a falha seguinte ficar maior.
          this.agendarProximaConsulta();
          this.pollAtrasoMs = Math.min(this.pollAtrasoMs * 2, ATRASO_MAXIMO_MS);
        },
      });
  }

  private aoResumoChegar(resumo: ResumoNotificacoes): void {
    this.pollEmAndamento = false;
    this.pollAtrasoMs = ATRASO_INICIAL_MS;
    const primeiraResposta = !this.pollRecebeuPrimeiraResposta;
    this.pollRecebeuPrimeiraResposta = true;
    const totalAnterior = this._totalNaoLidas();
    const idAnterior = this.ultimaNotificacaoIdConhecida;
    this._totalNaoLidas.set(resumo.totalNaoLidas);
    this.ultimaNotificacaoIdConhecida = resumo.ultimaNotificacaoId;

    if (!primeiraResposta) {
      if (resumo.ultimaNotificacaoId !== idAnterior) {
        this._notificacaoNova.next();
      }
      if (resumo.totalNaoLidas > totalAnterior) {
        this._anuncioAcessivel.set(
          resumo.totalNaoLidas === 1
            ? 'Você tem 1 notificação não lida.'
            : `Você tem ${resumo.totalNaoLidas} notificações não lidas.`,
        );
      }
    }
    this.agendarProximaConsulta();
  }

  private agendarProximaConsulta(): void {
    if (!this.pollAtivo) return;
    this.cancelarTimer();
    this.pollTimer = setTimeout(() => this.consultarResumo(), this.pollAtrasoMs);
  }
}
