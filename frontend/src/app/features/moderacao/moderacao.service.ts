import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import type { Pagina } from '../comunidades/comunidades.service';
import type { AutorResumo } from '../publicacoes/publicacoes.service';

/** Situações do filtro da fila (`GET /moderacao/denuncias?situacao=`). */
export type SituacaoDenuncia = 'PENDENTE' | 'RESOLVIDA' | 'DESCARTADA';

/** Espelha `ConteudoDenunciado` do `openapi.yaml`. */
export interface ConteudoDenunciado {
  tipo: 'PUBLICACAO';
  id: number;
  texto: string;
  autor: AutorResumo;
  comunidadeId: number | null;
  criadoEm: string;
  situacao: 'VISIVEL' | 'OCULTO';
}

/** Espelha `Denuncia` do `openapi.yaml` — sem nenhum campo do denunciante (RF77.1). */
export interface Denuncia {
  id: number;
  conteudo: ConteudoDenunciado;
  motivo: string;
  situacao: SituacaoDenuncia;
  criadoEm: string;
  resolvidaEm: string | null;
}

/** Espelha `DenunciaRegistrada` do `openapi.yaml`. */
export interface DenunciaRegistrada {
  id: number;
  criadoEm: string;
}

/** Mesmo limite de `DenunciaRequest.motivo`/`OcultacaoRequest.motivo` no contrato. */
export const TAMANHO_MAXIMO_MOTIVO = 1000;

/** Fala com o módulo Moderação do Epic 12 — `/denuncias` e `/moderacao/denuncias`. */
@Injectable({ providedIn: 'root' })
export class ModeracaoService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Quantas denúncias estão pendentes — contador do item "Denúncias" da sidebar (UJ-2,
   * passo 1). `null` enquanto não carregou. Compartilhado: a fila atualiza depois de
   * cada ação e a sidebar acompanha sem recarregar.
   */
  readonly pendentes = signal<number | null>(null);

  /** `POST /denuncias` (Story 12.1) — qualquer usuário autenticado; só postagem por enquanto. */
  denunciar(publicacaoId: number, motivo: string): Observable<DenunciaRegistrada> {
    return this.http.post<DenunciaRegistrada>(
      `${API_BASE_URL}/denuncias`,
      { tipoConteudo: 'PUBLICACAO', conteudoId: publicacaoId, motivo },
      { headers: this.authService.obterCabecalhoAutorizacao() },
    );
  }

  /** `GET /moderacao/denuncias` (Story 12.4) — mais antiga primeiro. Só MODERADOR. */
  listar(situacao: SituacaoDenuncia, pagina = 0, tamanho = 20): Observable<Pagina<Denuncia>> {
    return this.http
      .get<Pagina<Denuncia>>(`${API_BASE_URL}/moderacao/denuncias`, {
        headers: this.authService.obterCabecalhoAutorizacao(),
        params: { situacao, pagina: String(pagina), tamanho: String(tamanho) },
      })
      .pipe(
        tap((resultado) => {
          if (situacao === 'PENDENTE') {
            this.pendentes.set(resultado.totalElements);
          }
        }),
      );
  }

  /** Busca só o total de pendentes (página de 1 item) para o contador da sidebar. Best-effort. */
  atualizarPendentes(): void {
    this.listar('PENDENTE', 0, 1).subscribe({ error: () => undefined });
  }

  /** `POST /moderacao/denuncias/{id}/ocultacao` (Story 12.5, RF78) — motivo obrigatório. */
  ocultar(denunciaId: number, motivo: string): Observable<Denuncia> {
    return this.http.post<Denuncia>(
      `${API_BASE_URL}/moderacao/denuncias/${denunciaId}/ocultacao`,
      { motivo },
      { headers: this.authService.obterCabecalhoAutorizacao() },
    );
  }

  /** `POST /moderacao/denuncias/{id}/restauracao` (Story 12.5, RF78.1) — sem corpo. */
  restaurar(denunciaId: number): Observable<Denuncia> {
    return this.http.post<Denuncia>(`${API_BASE_URL}/moderacao/denuncias/${denunciaId}/restauracao`, null, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }

  /** `POST /moderacao/denuncias/{id}/descarte` — motivo opcional, só para o histórico. */
  descartar(denunciaId: number, motivo?: string): Observable<Denuncia> {
    return this.http.post<Denuncia>(
      `${API_BASE_URL}/moderacao/denuncias/${denunciaId}/descarte`,
      motivo ? { motivo } : {},
      { headers: this.authService.obterCabecalhoAutorizacao() },
    );
  }
}
