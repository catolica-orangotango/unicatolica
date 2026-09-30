import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import type { Pagina } from '../comunidades/comunidades.service';

/** Espelha `AutorResumo` do `openapi.yaml` — sem foto: o avatar sai das iniciais do nome. */
export interface AutorResumo {
  id: number;
  nome: string;
  curso: string | null;
}

/** Espelha `PublicacaoResponse` do `openapi.yaml` (Stories 3.1/3.2). */
export interface Publicacao {
  id: number;
  comunidadeId: number;
  autor: AutorResumo;
  conteudo: string;
  criadoEm: string;
}

/** Mesmo limite de `PublicacaoRequest.conteudo.maxLength` no contrato. */
export const TAMANHO_MAXIMO_CONTEUDO = 5000;

/** Fala com o módulo Publicações do Epic 3 — `/comunidades/{id}/publicacoes`. */
@Injectable({ providedIn: 'root' })
export class PublicacoesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** `GET /comunidades/{id}/publicacoes` (Story 3.2, RF36) — mais recente primeiro. */
  listar(comunidadeId: number, pagina = 0, tamanho = 20): Observable<Pagina<Publicacao>> {
    return this.http.get<Pagina<Publicacao>>(`${API_BASE_URL}/comunidades/${comunidadeId}/publicacoes`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
      params: { pagina: String(pagina), tamanho: String(tamanho) },
    });
  }

  /** `POST /comunidades/{id}/publicacoes` (Story 3.1, RF32–RF35) — só membro (403 se não for). */
  criar(comunidadeId: number, conteudo: string): Observable<Publicacao> {
    return this.http.post<Publicacao>(
      `${API_BASE_URL}/comunidades/${comunidadeId}/publicacoes`,
      { conteudo },
      { headers: this.authService.obterCabecalhoAutorizacao() },
    );
  }
}
