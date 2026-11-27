import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';

export type EscopoAviso = 'GERAL' | 'CURSO';

/** Espelha `AvisoResponse` do `openapi.yaml` (Story 13.1). */
export interface Aviso {
  id: number;
  titulo: string;
  mensagem: string;
  escopo: EscopoAviso;
  cursoId: number | null;
  cursoNome: string | null;
  dataDestaque: string | null;
  criadoEm: string;
}

/** `GET /avisos` — avisos institucionais do Início do usuário (Story 13.2, RF82). */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** Os gerais e os do curso do usuário que valem agora; lista vazia quando não há nenhum. */
  doInicio(): Observable<Aviso[]> {
    return this.http.get<Aviso[]>(`${API_BASE_URL}/avisos`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }
}
