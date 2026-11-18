import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import type { Pagina } from '../comunidades/comunidades.service';

/** Espelha `AutorAuditoria` do `openapi.yaml`: `nome` e `email` nulos = usuário que não existe mais. */
export interface AutorAuditoria {
  id: number;
  nome: string | null;
  email: string | null;
}

/** Espelha `LogAuditoriaResponse` (KAN-90); `autor` nulo é evento do sistema. */
export interface LogAuditoria {
  id: number;
  criadoEm: string;
  autor: AutorAuditoria | null;
  modulo: string;
  acao: string;
  entidadeAfetada: string | null;
  entidadeId: number | null;
  detalhes: string | null;
}

/** Espelha `FiltrosAuditoriaResponse`. */
export interface FiltrosAuditoria {
  modulos: string[];
  acoesPorModulo: Record<string, string[]>;
  entidadesAfetadas: string[];
}

/** Filtros da consulta; vazio ou ausente = sem filtro. `de` e `ate` são `AAAA-MM-DD`. */
export interface ConsultaAuditoria {
  modulo?: string;
  acao?: string;
  entidadeAfetada?: string;
  detalhes?: string;
  de?: string;
  ate?: string;
  pagina?: number;
}

export const TAMANHO_PAGINA_AUDITORIA = 20;

/** Fala com `/admin/auditoria` (KAN-90): só o perfil ADMINISTRADOR passa no backend (403 para os demais). */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** `GET /admin/auditoria` — filtros vazios nem vão na URL. */
  listar(consulta: ConsultaAuditoria = {}): Observable<Pagina<LogAuditoria>> {
    const parametros: Record<string, string> = {
      pagina: String(consulta.pagina ?? 0),
      tamanho: String(TAMANHO_PAGINA_AUDITORIA),
    };
    for (const chave of ['modulo', 'acao', 'entidadeAfetada', 'detalhes', 'de', 'ate'] as const) {
      const valor = consulta[chave];
      if (valor) parametros[chave] = valor;
    }

    return this.http.get<Pagina<LogAuditoria>>(`${API_BASE_URL}/admin/auditoria`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
      params: parametros,
    });
  }

  /** `GET /admin/auditoria/filtros` — valores que existem hoje, para as listas de seleção. */
  filtros(): Observable<FiltrosAuditoria> {
    return this.http.get<FiltrosAuditoria>(`${API_BASE_URL}/admin/auditoria/filtros`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }
}
