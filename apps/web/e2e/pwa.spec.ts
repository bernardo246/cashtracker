import { expect, test } from "./support/test";

test("PWA: service worker ativo e manifest standalone", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop Chrome", "service worker verificado só no Chromium");

  await page.goto("/login", { waitUntil: "networkidle" });
  const scope = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.scope;
  });
  expect(scope).toBe("http://127.0.0.1:3100/");

  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  expect(((await res.json()) as { display: string }).display).toBe("standalone");
});
