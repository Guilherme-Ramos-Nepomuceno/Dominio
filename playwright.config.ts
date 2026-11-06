import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

// E2E contra a pilha completa e local: banco de teste (Postgres em container,
// porta 5434) + API de teste (porta 3334) + front em build de produção
// (porta 3100). A API vem do repositório irmão `../dominio-api`, ou de
// DOMINIO_API_DIR (o CI usa isso para apontar para o checkout da API).
const API_DIR = process.env.DOMINIO_API_DIR ?? path.resolve(process.cwd(), "../dominio-api")
const API_URL = "http://localhost:3334"
const WEB_URL = "http://localhost:3100"
const CI = !!process.env.CI

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // Sem animações (framer-motion respeita): menos teste instável.
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "celular",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: [
    {
      // Banco zerado a cada execução, migrations do zero e a API em cima dele.
      command: "npm run test:db:down && npm run test:db:up && npm run test:db:migrate && npm run start:test",
      cwd: API_DIR,
      // Sem sessão a rota responde 401, o que já conta como "no ar".
      url: `${API_URL}/users/me`,
      reuseExistingServer: !CI,
      timeout: 180_000,
      stdout: "pipe",
    },
    {
      command: "npm run build && npx next start -p 3100",
      url: WEB_URL,
      env: { NEXT_PUBLIC_API_URL: API_URL },
      reuseExistingServer: !CI,
      timeout: 600_000,
    },
  ],
})
