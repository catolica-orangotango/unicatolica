import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
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

/**
 * Sininho de notificações da shell (Story 10.1, RF20.1). `notificacoes` é uma cache
 * compartilhada (signal), carregada uma vez no login (ver {@link Shell}) e recarregada ao
 * abrir o painel - a mesma lista alimenta o badge de não lidas na sidebar e o painel.
 */
@Injectable({ providedIn: 'root' })
export class NotificacoesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly _notificacoes = signal<Notificacao[]>([]);
  readonly notificacoes = this._notificacoes.asReadonly();
  readonly naoLidas = computed(() => this._notificacoes().filter((n) => !n.lida).length);

  /** `GET /notificacoes/me` - busca do zero e atualiza a cache compartilhada. */
  carregar(pagina = 0, tamanho = 20): Observable<Pagina<Notificacao>> {
    return this.http
      .get<Pagina<Notificacao>>(`${API_BASE_URL}/notificacoes/me`, {
        headers: this.authService.obterCabecalhoAutorizacao(),
        params: { pagina: String(pagina), tamanho: String(tamanho) },
      })
      .pipe(tap((pagina) => this._notificacoes.set(pagina.content)));
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
        tap(() =>
          this._notificacoes.update((lista) => lista.map((n) => (n.id === id ? { ...n, lida: true } : n))),
        ),
        map(() => undefined),
      );
  }
}
