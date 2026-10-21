import { expect, type Page } from "@playwright/test";

export const PASSWORD = "senha-segura-123";

/** Navega e espera a hidratação terminar (rede ociosa): antes disso o submit seria nativo, não do React. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "networkidle" });
}

let seq = 0;
export function uniqueEmail(prefix = "user"): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${process.pid}-${seq}@e2e.test`;
}

export async function signUp(page: Page, email: string, password = PASSWORD, name = "Ana E2E"): Promise<void> {
  await open(page, "/cadastro");
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/visao-geral/);
}

export async function logIn(page: Page, email: string, password = PASSWORD): Promise<void> {
  await open(page, "/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/visao-geral/);
}

export async function logOut(page: Page): Promise<void> {
  await open(page, "/ajustes");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
}

export async function addExpense(page: Page, amount: string, category: string): Promise<void> {
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByLabel("Valor").fill(amount);
  await page.getByRole("radio", { name: category }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByLabel("Valor")).toBeHidden();
}
