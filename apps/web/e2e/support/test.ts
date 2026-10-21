import { test as base, expect } from "@playwright/test";

// A CSP do app inclui `upgrade-insecure-requests`. O WebKit aplica isso até em http://127.0.0.1
// (o Chromium isenta localhost), quebrando o carregamento dos scripts na stack de E2E em HTTP.
// Removemos só essa diretiva nas respostas de documento; o restante da CSP é preservado.
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route(
      (url) => url.origin === "http://127.0.0.1:3100",
      async (route) => {
        if (route.request().resourceType() !== "document") return route.fallback();
        const response = await route.fetch();
        const csp = response.headers()["content-security-policy"];
        const headers = { ...response.headers() };
        if (csp) {
          headers["content-security-policy"] = csp
            .split(";")
            .map((d) => d.trim())
            .filter((d) => d !== "upgrade-insecure-requests")
            .join("; ");
        }
        return route.fulfill({ response, headers });
      },
    );
    await provide(page);
  },
});

export { expect };
