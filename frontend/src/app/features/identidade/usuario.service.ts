import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';

/** Espelha `UsuarioResponse` do backend (RF12/RF13) — usado na saudação da Home. */
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  curso: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** `GET /usuarios/me` (RF12) — dados do próprio usuário autenticado. */
  me(): Observable<Usuario> {
    return this.http.get<Usuario>(`${API_BASE_URL}/usuarios/me`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }
}
