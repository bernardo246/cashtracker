import { expect, test } from "@playwright/test";
import { logIn, logOut, open, signUp, uniqueEmail } from "./support/helpers";

const NEW_PASSWORD = "outra-senha-456";

test("esqueci a senha: link do e-mail, nova senha e login", async ({ page, request }) => {
  const email = uniqueEmail("reset");
  await signUp(page, email);
  await logOut(page);

  await open(page, "/esqueci-senha");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Enviar link" }).click();

  // o e-mail é enviado em segundo plano: aguarda a caixa de teste sem sleeps fixos
  let text = "";
  await expect(async () => {
    const res = await request.get("http://127.0.0.1:4100/__test/last-email", { params: { to: email } });
    expect(res.status()).toBe(200);
    text = ((await res.json()) as { text: string }).text;
  }).toPass();
  const link = /https?:\/\/\S+\/redefinir-senha\?token=\S+/.exec(text)?.[0];
  expect(link).toBeTruthy();

  const url = new URL(link!);
  await open(page, `${url.pathname}${url.search}`);
  await page.getByLabel("Nova senha", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Redefinir senha" }).click();
  await expect(page).toHaveURL(/\/login/);

  await logIn(page, email, NEW_PASSWORD);
});
