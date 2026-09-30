import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import type { Curso } from '../identidade/curso.service';

/** Espelha `Perfil` do `openapi.yaml` — o mesmo para o próprio perfil e o de outro usuário. */
export interface Perfil {
  usuarioId: number;
  nome: string;
  curso: Curso | null;
  /** `null` enquanto o perfil acadêmico não foi criado (Story 4.1). */
  periodo: number | null;
  interesses: string[];
}

/** Espelha `PerfilRequest` do `openapi.yaml`. */
export interface PerfilRequest {
  nome: string;
  cursoId: number;
  periodo: number;
  interesses: string[];
}

/** Limites do contrato (`PerfilRequest`). */
export const LIMITES_PERFIL = {
  nome: 200,
  periodoMaximo: 12,
  interesses: 10,
  interesse: 50,
} as const;

/** Fala com o módulo Perfil Acadêmico do Epic 4. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** `GET /perfil/me` (Story 4.2, RF20). */
  meu(): Observable<Perfil> {
    return this.http.get<Perfil>(`${API_BASE_URL}/perfil/me`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }

  /** `PUT /perfil/me` (Story 4.1, RF14–RF19) — cria na primeira vez, substitui nas seguintes. */
  salvar(perfil: PerfilRequest): Observable<Perfil> {
    return this.http.put<Perfil>(`${API_BASE_URL}/perfil/me`, perfil, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }

  /** `GET /usuarios/{id}/perfil` (Story 4.4, RF20.2) — somente leitura. */
  deUsuario(usuarioId: number): Observable<Perfil> {
    return this.http.get<Perfil>(`${API_BASE_URL}/usuarios/${usuarioId}/perfil`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }
}
