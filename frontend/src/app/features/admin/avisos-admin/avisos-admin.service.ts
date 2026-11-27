import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api.config';
import type { Pagina } from '../../comunidades/comunidades.service';
import type { Aviso, EscopoAviso } from '../../avisos/avisos.service';

export type { Aviso, EscopoAviso };

/** Espelha `AvisoRequest`: `cursoId` só no escopo CURSO. */
export interface AvisoNovo {
  titulo: string;
  mensagem: string;
  escopo: EscopoAviso;
  cursoId: number | null;
  dataDestaque: string | null;
}

/** Mesmos limites de `AvisoRequest` no contrato. */
export const LIMITE_TITULO_AVISO = 120;
export const LIMITE_MENSAGEM_AVISO = 2000;

/** `/admin/avisos` — só ADMINISTRADOR (Story 13.1, RF81). */
@Injectable({ providedIn: 'root' })
export class AvisosAdminService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** `POST /admin/avisos` — 201 com o aviso publicado. */
  publicar(aviso: AvisoNovo): Observable<Aviso> {
    return this.http.post<Aviso>(`${API_BASE_URL}/admin/avisos`, aviso, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }

  /** `GET /admin/avisos` — os enviados, mais recente primeiro. */
  listar(pagina = 0, tamanho = 5): Observable<Pagina<Aviso>> {
    return this.http.get<Pagina<Aviso>>(`${API_BASE_URL}/admin/avisos`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
      params: { pagina: String(pagina), tamanho: String(tamanho) },
    });
  }
}
