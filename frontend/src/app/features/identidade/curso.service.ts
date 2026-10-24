import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';

/** Espelha `Curso` do `openapi.yaml` — lista cadastrada por administrador (KAN-44). */
export interface Curso {
  id: number;
  nome: string;
}

/** Espelha `CursoAdmin`: o curso com a situação, como o administrador o vê (KAN-44). */
export interface CursoAdmin extends Curso {
  ativo: boolean;
}

/** `maxLength` do nome do curso no contrato (`CursoRequest`). */
export const LIMITE_NOME_CURSO = 150;

@Injectable({ providedIn: 'root' })
export class CursoService {
  private readonly http = inject(HttpClient);

  /** `GET /cursos` — público (sem token): o cadastro precisa da lista antes do login. */
  listar(): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${API_BASE_URL}/cursos`);
  }

  /** `GET /admin/cursos` — todos os cursos, com os desativados (só ADMINISTRADOR). */
  listarAdmin(): Observable<CursoAdmin[]> {
    return this.http.get<CursoAdmin[]>(`${API_BASE_URL}/admin/cursos`);
  }

  /** `POST /cursos` — cadastra o curso e, no backend, a comunidade de curso (só ADMINISTRADOR). */
  cadastrar(nome: string): Observable<CursoAdmin> {
    return this.http.post<CursoAdmin>(`${API_BASE_URL}/cursos`, { nome });
  }

  /** `PUT /cursos/{id}` — renomeia e/ou ativa/desativa; os dois campos vão sempre (só ADMINISTRADOR). */
  atualizar(id: number, corpo: { nome: string; ativo: boolean }): Observable<CursoAdmin> {
    return this.http.put<CursoAdmin>(`${API_BASE_URL}/cursos/${id}`, corpo);
  }
}
