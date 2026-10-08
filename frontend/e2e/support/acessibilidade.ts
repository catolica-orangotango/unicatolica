import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const TAGS_WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

/**
 * RNF06 (T6, KAN-71): roda o axe na página como está e falha com violação `serious` ou
 * `critical` da WCAG 2.2 AA. Teclado, leitor de tela e ordem de foco ficam no checklist
 * manual (`docs/acessibilidade-checklist.md`), que o axe não cobre.
 */
export async function esperarSemViolacoes(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Medir no meio do fade de abertura de um painel dá contraste falso.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));

  const { violations } = await new AxeBuilder({ page }).withTags(TAGS_WCAG_22_AA).analyze();
  const graves = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`);

  expect(graves, graves.join('\n')).toEqual([]);
}
