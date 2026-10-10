import { defineConfig, devices } from '@playwright/test';

/**
 * Testes E2E de browser (Epic 14 - QA). Cobrem o que existe hoje: telas
 * públicas de auth, o fluxo login -> shell, a sidebar por papel (Story 14.3),
 * o dropdown do avatar e os toasts (Story 14.5).
 *
 * O runner sobe o `ng serve` sozinho (`webServer` abaixo). Nenhuma suíte
 * precisa do backend: as chamadas `/auth/*` são mockadas com `page.route()`.
 * Os testes que falam com o Quarkus real têm a tag `@backend` e só rodam com
 * `E2E_BACKEND=1` (job "E2E backend" do CI; ver `e2e/backend-real.spec.ts`).
 *
 * Pré-requisito único: `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    // O app só emite JWT via login; a decodificação no frontend é só do payload
    // (sem checar assinatura), então os testes de papel plantam um JWT não
    // assinado no localStorage. Ver `e2e/support/jwt.ts`.
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
