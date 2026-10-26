import { sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { createRefreshTokenStore } from "./refresh-tokens.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const RESET_RETENTION_MS = 7 * DAY_MS;

/** Apaga tokens de redefinição de senha usados ou expirados há mais de 7 dias. */
export async function purgePasswordResetTokens(db: Db, at: Date): Promise<number> {
  const cutoff = new Date(at.getTime() - RESET_RETENTION_MS);
  const rows = await db.execute<{ n: number }>(sql`
    WITH d AS (
      DELETE FROM app.password_reset_tokens
      WHERE used_at < ${cutoff.toISOString()}::timestamptz OR expires_at < ${cutoff.toISOString()}::timestamptz
      RETURNING 1
    )
    SELECT count(*)::int AS n FROM d`);
  return Number(rows[0]?.n ?? 0);
}

type Logger = { info: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void };

/** Limpeza imediata (sem bloquear quem chama) e depois a cada 24h. Devolve a função que cancela o agendamento. */
export function startTokenCleanup(db: Db, log: Logger, now: () => Date = () => new Date()): () => void {
  const refreshTokens = createRefreshTokenStore(db, now);
  let running = false;
  const run = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const at = now();
      const refresh = await refreshTokens.purgeStale(at);
      const reset = await purgePasswordResetTokens(db, at);
      log.info({ refresh, reset }, "limpeza de tokens");
    } catch (err) {
      log.error({ err }, "falha na limpeza de tokens");
    } finally {
      running = false;
    }
  };
  void run();
  const timer = setInterval(() => void run(), DAY_MS);
  timer.unref();
  return () => clearInterval(timer);
}
