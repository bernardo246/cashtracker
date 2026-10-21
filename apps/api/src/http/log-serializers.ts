import { DrizzleQueryError } from "drizzle-orm/errors";

type ErrLike = { name?: unknown; message?: unknown; stack?: unknown; code?: unknown; cause?: unknown };

const isRecord = (v: unknown): v is ErrLike => typeof v === "object" && v !== null;
const sqlState = (v: unknown): string | undefined => (isRecord(v) && typeof v.code === "string" ? v.code : undefined);

function isDbError(err: ErrLike): boolean {
  if (err instanceof DrizzleQueryError || err.name === "PostgresError") return true;
  return isRecord(err.cause) && err.cause.name === "PostgresError";
}

/**
 * Serializer de `err` do pino. Erros de banco carregam a query e os parâmetros (hashes de senha,
 * e-mails, hashes de token) na mensagem, no stack e em campos próprios: aqui só sai uma lista
 * fechada de campos e, para erros de banco, mensagem genérica e stack sem o cabeçalho.
 */
export type SafeErr = { [key: string]: unknown; type: string; message: string; stack: string };

export function serializeErr(err: unknown): SafeErr {
  if (!isRecord(err)) return { type: "NonError", message: "erro não identificado", stack: "" };
  const db = isDbError(err);
  const out: SafeErr = {
    type: typeof err.name === "string" ? err.name : "Error",
    message: db ? "falha de banco de dados" : typeof err.message === "string" ? err.message : "erro",
    stack: "",
  };
  const code = sqlState(err) ?? sqlState(err.cause);
  if (code) out.code = code;
  if (typeof err.stack === "string") {
    out.stack = db
      ? err.stack
          .split("\n")
          .filter((l) => /^\s+at /.test(l))
          .join("\n")
      : err.stack;
  }
  return out;
}
