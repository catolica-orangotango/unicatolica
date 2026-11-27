import type { Page } from '@playwright/test';
import { CHAVE_TOKEN, jwtNaoAssinado } from './jwt';

/**
 * Planta um JWT não assinado com os `perfis` dados no `localStorage` antes de
 * qualquer navegação da página. Use para entrar na shell autenticada sem
 * backend (o guard só checa presença do token).
 */
export async function plantarToken(page: Page, perfis: string[], usuarioId?: string): Promise<void> {
  const token = jwtNaoAssinado(perfis, usuarioId);
  await page.addInitScript(([chave, valor]) => window.localStorage.setItem(chave, valor), [
    CHAVE_TOKEN,
    token,
  ] as const);
}

/**
 * Garante que NÃO há token no `localStorage` antes da navegação (estado de
 * visitante). Contextos do Playwright já nascem limpos; isto é uma trava
 * explícita contra vazamento de estado entre testes.
 */
export async function semToken(page: Page): Promise<void> {
  await page.addInitScript((chave) => window.localStorage.removeItem(chave), CHAVE_TOKEN);
}

/** Lê o token atual do `localStorage` da página (ou `null`). */
export function tokenAtual(page: Page): Promise<string | null> {
  return page.evaluate((chave) => window.localStorage.getItem(chave), CHAVE_TOKEN);
}
