import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { ToastService } from '../../ui';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';

/** Espelha `ComunidadeResponse` do backend (Stories 2.2/2.4/2.5). */
export interface Comunidade {
  id: number;
  nome: string;
  descricao: string | null;
  tipo: 'CURSO' | 'ABERTA';
  souMembro: boolean | null;
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

/** Tamanho da coluna `comunidade.nome`; o backend ainda não valida (DT-5). */
export const LIMITE_NOME_COMUNIDADE = 150;

/**
 * Fala com o módulo Comunidades do Epic 2 (protótipo, ver
 * docs/decisoes/2026-08-modelo-epico-2-comunidades.md) — criar comunidade aberta,
 * listar/filtrar, "minhas comunidades" e entrar/sair.
 *
 * `minhasComunidades` é uma cache compartilhada (signal): o `Shell` (sidebar,
 * "Suas comunidades"), a Home e a lista de descoberta leem todos do mesmo lugar, e
 * {@link ingressar}/{@link sair} recarregam essa cache automaticamente — entrar numa
 * comunidade em qualquer tela atualiza a sidebar sem precisar recarregar a página.
 */
@Injectable({ providedIn: 'root' })
export class ComunidadesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  private readonly _minhasComunidades = signal<Comunidade[]>([]);
  readonly minhasComunidades = this._minhasComunidades.asReadonly();

  /** `GET /comunidades/minhas` — busca do zero e atualiza a cache compartilhada. */
  carregarMinhas(): Observable<Comunidade[]> {
    return this.http
      .get<Comunidade[]>(`${API_BASE_URL}/comunidades/minhas`, {
        headers: this.authService.obterCabecalhoAutorizacao(),
      })
      .pipe(tap((comunidades) => this._minhasComunidades.set(comunidades)));
  }

  /**
   * `GET /comunidades/{id}` (Story 2.5, RF27.1) — detalhe de uma comunidade, com
   * `souMembro` sempre preenchido (nunca null, ao contrário de {@link listar}).
   * Alimenta a "Home da comunidade" (mesmo padrão pra todas — curso ou aberta).
   */
  obter(id: number): Observable<Comunidade> {
    return this.http.get<Comunidade>(`${API_BASE_URL}/comunidades/${id}`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }

  /** `POST /comunidades` (Story 2.2) — recarrega a sidebar; falha só na recarga não desfaz a criação. */
  criar(dados: { nome: string; descricao: string | null }): Observable<Comunidade> {
    return this.http
      .post<Comunidade>(`${API_BASE_URL}/comunidades`, dados, {
        headers: this.authService.obterCabecalhoAutorizacao(),
      })
      .pipe(
        switchMap((comunidade) =>
          this.carregarMinhas().pipe(
            catchError(() => of([])),
            map(() => comunidade),
          ),
        ),
      );
  }

  /** `GET /comunidades` (Story 2.5, RF27/RF28) — lista/filtra, paginado. */
  listar(opcoes: { tipo?: 'CURSO' | 'ABERTA'; nome?: string; pagina?: number; tamanho?: number } = {}): Observable<
    Pagina<Comunidade>
  > {
    const parametros: Record<string, string> = {};
    if (opcoes.tipo) parametros['tipo'] = opcoes.tipo;
    if (opcoes.nome) parametros['nome'] = opcoes.nome;
    parametros['pagina'] = String(opcoes.pagina ?? 0);
    parametros['tamanho'] = String(opcoes.tamanho ?? 20);

    return this.http.get<Pagina<Comunidade>>(`${API_BASE_URL}/comunidades`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
      params: parametros,
    });
  }

  /**
   * `POST /comunidades/{id}/membros` (Story 2.4, RF24/RF25) — só comunidades abertas.
   * Recarrega {@link minhasComunidades} antes de completar, então quem assina já vê a
   * cache atualizada, e dispara o toast "Você entrou em {comunidade}" (critério de
   * aceite da Story 2.4) — centralizado aqui porque Home, lista de descoberta e a
   * página de cada comunidade chamam este método pra ingressar.
   */
  ingressar(id: number, nome: string): Observable<void> {
    return this.http
      .post<void>(`${API_BASE_URL}/comunidades/${id}/membros`, null, {
        headers: this.authService.obterCabecalhoAutorizacao(),
      })
      .pipe(
        switchMap(() => this.carregarMinhas()),
        tap(() => this.toastService.mostrar(`Você entrou em ${nome}`)),
        map(() => undefined),
      );
  }

  /** `DELETE /comunidades/{id}/membros/me` (Story 2.4, RF26) — mesma recarga da cache. */
  sair(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API_BASE_URL}/comunidades/${id}/membros/me`, {
        headers: this.authService.obterCabecalhoAutorizacao(),
      })
      .pipe(
        switchMap(() => this.carregarMinhas()),
        map(() => undefined),
      );
  }
}
