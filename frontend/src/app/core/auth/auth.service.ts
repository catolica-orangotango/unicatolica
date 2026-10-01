import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
}

const TOKEN_STORAGE_KEY = 'pacext.token';

/**
 * Nome da claim do JWT que carrega os perfis globais do usuário.
 *
 * O backend configura `smallrye.jwt.path.groups=roles` (application.properties),
 * então o token emitido carrega o perfil sob `roles` - nunca `groups`. Esta
 * constante é a única fonte da verdade compartilhada entre `AuthService` e o
 * seu spec, para que os dois não divirjam.
 */
export const JWT_ROLES_CLAIM = 'roles';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, { email, senha } satisfies LoginRequest)
      .pipe(tap((resposta) => this.armazenarToken(resposta.token)));
  }

  private armazenarToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  obterToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  /**
   * Header `Authorization` pronto pra passar em `{ headers }` de qualquer chamada
   * autenticada — ainda não existe um `HttpInterceptor` global (AD-7 não decidiu isso
   * ainda), então cada serviço que fala com endpoint autenticado usa isto explicitamente
   * (ver `ComunidadesService`/`UsuarioService`, Épico 2).
   */
  obterCabecalhoAutorizacao(): Record<string, string> {
    const token = this.obterToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  logout(): void {
    const token = this.obterToken();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (token) {
      // Encerra a sessão no servidor (Story 1.6) — best-effort: mesmo se falhar (ex.: token
      // já expirado), a sessão local já foi encerrada acima, que é o que importa para o usuário.
      // A falha é logada (não silenciada) para não esconder um problema real de quem
      // estiver testando/depurando (defeito D8) — só não bloqueia o logout local.
      this.http
        .post(`${API_BASE_URL}/auth/logout`, null, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .subscribe({ error: (erro) => console.error('Falha ao encerrar sessão no servidor.', erro) });
    }
  }

  /**
   * Perfis globais do usuário autenticado, lidos da claim `JWT_ROLES_CLAIM` do
   * token. Decodificação apenas do payload (sem verificar assinatura: o guard e o
   * backend já garantem autenticação). Qualquer falha degrada para `[]`, então um
   * token adulterado só consegue esconder itens privilegiados, nunca revelá-los.
   */
  perfis(): string[] {
    const payload = this.decodificarPayloadJwt();
    const claim = payload?.[JWT_ROLES_CLAIM];
    if (typeof claim === 'string') {
      return [claim];
    }
    return Array.isArray(claim)
      ? claim.filter((valor): valor is string => typeof valor === 'string')
      : [];
  }

  possuiPerfil(perfil: string): boolean {
    return this.perfis().includes(perfil);
  }

  /**
   * Id do usuário autenticado, da claim `sub`. `null` sem token ou com `sub` não
   * numérico. Só serve para decisões de tela (ex.: esconder "Denunciar" na própria
   * postagem) — quem barra de verdade é o backend.
   */
  usuarioId(): number | null {
    const sub = this.decodificarPayloadJwt()?.['sub'];
    const id = typeof sub === 'string' && /^\d+$/.test(sub) ? Number(sub) : NaN;
    return Number.isSafeInteger(id) ? id : null;
  }

  /**
   * Decodifica só o segmento de payload do JWT armazenado. Base64url -> base64,
   * decodificação UTF-8-safe (para claims com caracteres multibyte não quebrarem
   * o `JSON.parse`) e parse. Retorna `null` em qualquer erro.
   */
  private decodificarPayloadJwt(): Record<string, unknown> | null {
    try {
      const token = this.obterToken();
      if (!token) {
        return null;
      }

      const segmento = token.split('.')[1];
      if (!segmento) {
        return null;
      }

      const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/');
      const preenchido = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const binario = atob(preenchido);
      const bytes = Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
      const json = new TextDecoder().decode(bytes);
      const payload = JSON.parse(json) as unknown;

      if (Array.isArray(payload)) {
        return null;
      }

      return payload !== null && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}
