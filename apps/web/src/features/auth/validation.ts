// Interface estrutural: evita depender diretamente do zod no app web.
interface Schema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[] }[] } };
}

export type FieldErrors = Record<string, string>;

const MESSAGES: FieldErrors = {
  name: "Informe seu nome (até 80 caracteres)",
  email: "Informe um e-mail válido",
  password: "A senha deve ter entre 8 e 128 caracteres",
  token: "Link inválido ou expirado",
};

/** Valida com o schema compartilhado e devolve mensagens em pt-BR por campo. */
export function validate<T>(
  schema: Schema<T>,
  data: unknown,
  overrides: FieldErrors = {},
): { data: T | null; errors: FieldErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= overrides[key] ?? MESSAGES[key] ?? "Valor inválido";
  }
  return { data: null, errors };
}

export function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]));
}
