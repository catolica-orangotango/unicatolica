import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api.config';

/** Espelha `PerfilAcademico` do backend (Épico 4) — nome/curso vêm de Identidade. */
export interface PerfilAcademico {
  usuarioId: number;
  nome: string;
  curso: string | null;
  periodo: number | null;
  interesses: string[];
}

/** Corpo de `PUT /perfil/me` (Story 4.1). */
export interface PerfilRequest {
  nome: string;
  curso: string | null;
  periodo: number | null;
  interesses: string[];
}

/** Fala com o módulo Perfil Acadêmico do Épico 4 — consultar, salvar e ver de outro. */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** `GET /perfil/me` (Story 4.2, RF20). */
  me(): Observable<PerfilAcademico> {
    return this.http.get<PerfilAcademico>(`${API_BASE_URL}/perfil/me`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }

  /** `PUT /perfil/me` (Story 4.1, RF14-RF19) — cria ou edita, mesma operação. */
  salvar(request: PerfilRequest): Observable<PerfilAcademico> {
    return this.http.put<PerfilAcademico>(`${API_BASE_URL}/perfil/me`, request, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }

  /** `GET /perfil/{usuarioId}` (Story 4.4, RF20.2) — perfil público, só leitura. */
  obter(usuarioId: number): Observable<PerfilAcademico> {
    return this.http.get<PerfilAcademico>(`${API_BASE_URL}/perfil/${usuarioId}`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }
}
