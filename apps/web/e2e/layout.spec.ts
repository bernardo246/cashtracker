import { expect, test } from "./support/test";
import { addExpense, open, signUp, uniqueEmail } from "./support/helpers";

const ROUTES = ["/visao-geral", "/lancamentos", "/gastos", "/entradas", "/ajustes"];

test("sem rolagem horizontal da página em todas as rotas do app", async ({ page }) => {
  await signUp(page, uniqueEmail("layout"));
  await addExpense(page, "1234,56", "Delivery");
  for (const route of ROUTES) {
    await open(page, route);
    await expect(page.getByRole("main")).toBeVisible();
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth, route).toBeLessThanOrEqual(innerWidth);
  }
});
