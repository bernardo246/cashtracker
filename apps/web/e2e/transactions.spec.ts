import { expect, test } from "@playwright/test";
import { addExpense, open, signUp, uniqueEmail } from "./support/helpers";

test("lançar R$ 45,90 em Delivery aparece em Lançamentos e em Gastos", async ({ page }) => {
  await signUp(page, uniqueEmail());
  await addExpense(page, "45,90", "Delivery");

  await open(page, "/lancamentos");
  const row = page.getByRole("main").getByRole("listitem").filter({ hasText: "Delivery" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("45,90");

  await open(page, "/gastos");
  const item = page.getByRole("list", { name: /^Gastos por categoria/ }).getByRole("listitem").filter({ hasText: "Delivery" });
  await expect(item).toBeVisible();
  await expect(item).toContainText("R$ 45,90");
});
