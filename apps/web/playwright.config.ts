import { defineConfig, devices } from "@playwright/test";

const WEB_URL = "http://127.0.0.1:3100";
const API_URL = "http://127.0.0.1:4100";
const isCI = !!process.env.CI;

// 127.0.0.1 (IP literal) evita que o WebKit aplique o HSTS do Next a localhost. Portas 3100/4100 deixam as de desenvolvimento (3000/4000) livres.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: WEB_URL, trace: "retain-on-failure", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "iPhone 15", use: { ...devices["iPhone 15"] } },
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "pnpm --filter @cash/api build && node e2e/support/start-api.mjs",
      url: `${API_URL}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: "pipe",
    },
    {
      command: "pnpm build && pnpm exec next start -p 3100",
      url: `${WEB_URL}/login`,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { API_URL },
    },
  ],
});
