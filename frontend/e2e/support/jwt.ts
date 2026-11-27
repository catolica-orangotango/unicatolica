/**
 * Monta um JWT NÃO ASSINADO com a claim de perfis que o frontend lê.
 *
 * `AuthService.decodificarPayloadJwt()` (auth.service.ts) decodifica só o
 * segmento de payload e nunca verifica a assinatura, e o `authGuard` só checa
 * a presença do token. Então, para exercitar o gating por papel da sidebar
 * (Story 14.3) sem subir o backend, basta plantar um token com o payload
 * certo no `localStorage`.
 *
 * A claim é `roles` porque o backend configura `smallrye.jwt.path.groups=roles`
 * (application.properties) - a mesma constante `JWT_ROLES_CLAIM` usada em
 * `auth.service.ts` e `shell.spec.ts`.
 */
export const CLAIM_PERFIS = 'roles';

/** Chave do token no localStorage (igual a `TOKEN_STORAGE_KEY` em auth.service.ts). */
export const CHAVE_TOKEN = 'pacext.token';

function base64url(valor: unknown): string {
  return Buffer.from(JSON.stringify(valor), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * @param perfis lista de perfis globais (ex.: `['ALUNO']`, `['MODERADOR']`).
 *               Passe `[]` para um token válido de usuário sem perfil.
 */
export function jwtNaoAssinado(perfis: string[], usuarioId: string = 'e2e-user'): string {
  const header = base64url({ alg: 'none', typ: 'JWT' });
  const payload = base64url({ sub: usuarioId, [CLAIM_PERFIS]: perfis });
  return `${header}.${payload}.assinatura-ignorada`;
}
