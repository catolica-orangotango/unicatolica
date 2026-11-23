import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_BASE_URL } from '../../core/config/api.config';
import type { Pagina } from '../comunidades/comunidades.service';
import type { AutorResumo } from '../publicacoes/publicacoes.service';

export type TipoEnquete = 'UNICA' | 'MULTIPLA';

/** Espelha `EnqueteOpcaoResponse` do `openapi.yaml`. */
export interface OpcaoEnquete {
  id: number;
  texto: string;
}

/** Espelha `EnqueteResultado` do `openapi.yaml` (Story 8.5). */
export interface ResultadoEnquete {
  /** Quantas pessoas votaram (em escolha múltipla, não soma as opções). */
  totalVotantes: number;
  /** Mínimo de votos para liberar a contagem numa enquete ativa (RF58.1). */
  votosNecessarios: number;
  /** Falso abaixo do mínimo: só o total aparece e `opcoes` vem vazio. */
  liberado: boolean;
  opcoes: { opcaoId: number; votos: number }[];
}

/** Espelha `EnqueteResponse` do `openapi.yaml` (Stories 8.1 e 8.5). */
export interface Enquete {
  id: number;
  comunidadeId: number;
  autor: AutorResumo;
  pergunta: string;
  tipo: TipoEnquete;
  limiteSelecao: number | null;
  opcoes: OpcaoEnquete[];
  /** Só a `ATIVA` aceita voto; `ENCERRADA` (Story 8.6) e `OCULTA` (moderação, RF55.3) não. */
  situacao: 'ATIVA' | 'ENCERRADA' | 'OCULTA';
  /** Se o usuário já votou (RF56.1) — só diz que votou, nunca em quem (RF57.1). */
  jaVotei: boolean;
  /** Null enquanto o usuário não pode ver: ativa em que não votou, ou oculta (Story 8.5). */
  resultado: ResultadoEnquete | null;
  criadaEm: string;
}

/** Espelha `EnqueteRequest` do `openapi.yaml`. */
export interface NovaEnquete {
  pergunta: string;
  tipo: TipoEnquete;
  /** Só em escolha múltipla (RF54.2); `null` em escolha única. */
  limiteSelecao: number | null;
  opcoes: string[];
}

/** Limites do contrato (`EnqueteRequest`) e da regra RF53.3. */
export const LIMITE_PERGUNTA = 300;
export const LIMITE_OPCAO = 100;
export const MINIMO_OPCOES = 2;
export const MAXIMO_OPCOES = 5;
export const MAXIMO_ATIVAS_POR_COMUNIDADE = 2;

/** Fala com o módulo Enquetes do Epic 8 (Story 8.1). */
@Injectable({ providedIn: 'root' })
export class EnquetesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /** `POST /comunidades/{id}/enquetes` (RF53.1, RF53.3, RF54) — só membro (403), no máximo duas ativas (409). */
  criar(comunidadeId: number, corpo: NovaEnquete): Observable<Enquete> {
    return this.http.post<Enquete>(`${API_BASE_URL}/comunidades/${comunidadeId}/enquetes`, corpo, {
      headers: this.authService.obterCabecalhoAutorizacao(),
    });
  }

  /**
   * `POST /enquetes/{id}/votos` (Story 8.3) — só membro (403), uma vez por usuário (409 `JA_VOTOU`); em escolha
   * única uma opção, em múltipla até `limiteSelecao` (422). O voto é anônimo: a resposta é 204 sem corpo.
   */
  votar(enqueteId: number, opcaoIds: number[]): Observable<void> {
    return this.http.post<void>(
      `${API_BASE_URL}/enquetes/${enqueteId}/votos`,
      { opcaoIds },
      { headers: this.authService.obterCabecalhoAutorizacao() },
    );
  }

  /** `GET /comunidades/{id}/enquetes` — mais recente primeiro. */
  listarDaComunidade(comunidadeId: number, pagina = 0, tamanho = 20): Observable<Pagina<Enquete>> {
    return this.http.get<Pagina<Enquete>>(`${API_BASE_URL}/comunidades/${comunidadeId}/enquetes`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
      params: { pagina: String(pagina), tamanho: String(tamanho) },
    });
  }

  /** `GET /enquetes/minhas` — as ativas do usuário em todas as comunidades (base do limite RF53.3). */
  minhasAtivas(tamanho = 100): Observable<Pagina<Enquete>> {
    return this.http.get<Pagina<Enquete>>(`${API_BASE_URL}/enquetes/minhas`, {
      headers: this.authService.obterCabecalhoAutorizacao(),
      params: { pagina: '0', tamanho: String(tamanho) },
    });
  }
}
