import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, switchMap, tap } from 'rxjs';
import { ToastService } from '../../ui';
import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api.config';

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

/** Corpo de `POST /comunidades/curso` (Story 2.1). */
export interface ComunidadeRequest {
  nome: string;
  descricao?: string | null;
}

/**
 * Fala com o módulo Comunidades do Epic 2 (protótipo, ver
 * docs/decisoes/2026-08-modelo-epico-2-comunidades.md) — listar/filtrar, "minhas
 * comunidades", entrar/sair e a pré-criação de comunidade de curso pelo administrador
 * (Story 2.1). Criação de comunidade aberta (Story 2.2) fica pra quando a tela de
 * criação existir.
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

  /**
   * `POST /comunidades/curso` (Story 2.1, RF21.1/RF21.2) — só ADMINISTRADOR de
   * plataforma; o backend recusa com 403 caso contrário. Não passa por
   * {@link carregarMinhas}: o administrador não vira membro da comunidade de curso
   * que cria — comunidade de curso não tem botão "participar" (RF21.1).
   */
  criarComunidadeCurso(nome: string, descricao: string | null): Observable<Comunidade> {
    return this.http
      .post<Comunidade>(
        `${API_BASE_URL}/comunidades/curso`,
        { nome, descricao } satisfies ComunidadeRequest,
        { headers: this.authService.obterCabecalhoAutorizacao() },
      )
      .pipe(tap((comunidade) => this.toastService.mostrar(`Comunidade de curso "${comunidade.nome}" criada.`)));
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
