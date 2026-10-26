import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import type { Pagina } from '../comunidades/comunidades.service';

export type PerfilPlataforma = 'ALUNO' | 'MODERADOR' | 'ADMINISTRADOR';

/** Espelha `UsuarioAdminResponse` do `openapi.yaml` (KAN-83). */
export interface UsuarioAdmin {
  id: number;
  nomeCompleto: string;
  email: string;
  curso: string | null;
  perfil: PerfilPlataforma;
  ativo: boolean;
}

/** Fala com `/admin/usuarios`: só o perfil ADMINISTRADOR passa no backend (403 para os demais). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** `GET /admin/usuarios` — `busca` casa por trecho do nome ou do e-mail. */
  listarUsuarios(
    opcoes: { busca?: string; perfil?: PerfilPlataforma; pagina?: number; tamanho?: number } = {},
  ): Observable<Pagina<UsuarioAdmin>> {
    const parametros: Record<string, string> = {
      pagina: String(opcoes.pagina ?? 0),
      tamanho: String(opcoes.tamanho ?? 20),
    };
    if (opcoes.busca) parametros['busca'] = opcoes.busca;
    if (opcoes.perfil) parametros['perfil'] = opcoes.perfil;

    return this.http.get<Pagina<UsuarioAdmin>>(`${API_BASE_URL}/admin/usuarios`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
      params: parametros,
    });
  }

  /** `PUT /admin/usuarios/{id}/perfil` — a sessão do usuário afetado cai e ele entra de novo. */
  alterarPerfil(id: number, perfil: PerfilPlataforma): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(
      `${API_BASE_URL}/admin/usuarios/${id}/perfil`,
      { perfil },
      { headers: this.authService.obterCabecalhoAutorizacao() },
    );
  }

  /** `PUT /admin/usuarios/{id}/ativo` — `false` desativa a conta, `true` reativa. */
  alterarSituacao(id: number, ativo: boolean): Observable<UsuarioAdmin> {
    return this.http.put<UsuarioAdmin>(
      `${API_BASE_URL}/admin/usuarios/${id}/ativo`,
      { ativo },
      { headers: this.authService.obterCabecalhoAutorizacao() },
    );
  }
}
