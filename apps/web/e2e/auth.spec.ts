import { test } from "@playwright/test";
import { logIn, logOut, signUp, uniqueEmail } from "./support/helpers";

test("cadastro, logout e login com a mesma senha", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await logOut(page);
  await logIn(page, email);
});

test("login com o e-mail em maiúsculas", async ({ page }) => {
  const email = uniqueEmail("mixed");
  await signUp(page, email);
  await logOut(page);
  await logIn(page, email.toUpperCase());
});
