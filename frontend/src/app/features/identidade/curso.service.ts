import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';

/** Espelha `Curso` do `openapi.yaml` — lista cadastrada por administrador (KAN-44). */
export interface Curso {
  id: number;
  nome: string;
}

@Injectable({ providedIn: 'root' })
export class CursoService {
  private readonly http = inject(HttpClient);

  /** `GET /cursos` — público (sem token): o cadastro precisa da lista antes do login. */
  listar(): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${API_BASE_URL}/cursos`);
  }
}
