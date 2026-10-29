import type { Locator, Page } from '@playwright/test';

/**
 * Apoio dos e2e da casca do redesign (KAN-91): viewports de referência e os gatilhos
 * do menu da conta, que mudam de lugar conforme a largura.
 *
 * - Desktop (1440): menu, conteúdo e lateral centrados (248/600/340).
 * - Tablet (1024): abaixo de 1180px a lateral some; ficam menu e conteúdo.
 * - Celular (360): abaixo de 760px, barra superior e barra de abas; o menu vira a
 *   gaveta "Suas comunidades".
 */
export const VIEWPORT_DESKTOP = { width: 1440, height: 900 };
export const VIEWPORT_TABLET = { width: 1024, height: 768 };
export const VIEWPORT_CELULAR = { width: 360, height: 800 };

/** O `<nav>` do menu (no celular, a gaveta "Suas comunidades"). */
export function navPrincipal(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Navegação principal' });
}

/** Barra de abas do celular. */
export function barraDeAbas(page: Page): Locator {
  return page.getByRole('navigation', { name: 'Navegação inferior' });
}

/**
 * Cartão da conta no rodapé do menu (desktop e tablet). Sem `aria-label`: o nome
 * acessível é o conteúdo, nome do usuário (de `GET /usuarios/me`, que `mockFeedOk`
 * responde com "Usuário Teste") e papel.
 */
export function cartaoDaConta(page: Page): Locator {
  return navPrincipal(page).getByRole('button', { name: /Usuário Teste/ });
}

/** Avatar "Menu da conta" da barra superior do celular. */
export function avatarDaConta(page: Page): Locator {
  return page.getByRole('button', { name: 'Menu da conta' });
}

/**
 * O gatilho do menu da conta visível no viewport atual: até 760px o avatar da
 * barra superior, acima dele o cartão do rodapé do menu.
 */
export function gatilhoDaConta(page: Page): Locator {
  const largura = page.viewportSize()?.width ?? VIEWPORT_DESKTOP.width;
  return largura <= 760 ? avatarDaConta(page) : cartaoDaConta(page);
}

/** O menu da conta aberto (UcMenu com rótulo "Conta"). */
export function menuDaConta(page: Page): Locator {
  return page.getByRole('menu', { name: 'Conta' });
}
