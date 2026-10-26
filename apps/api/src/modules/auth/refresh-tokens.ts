import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { refreshTokens } from "../../db/schema.js";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GRACE_MS = 30_000;
const PURGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PURGE_BATCH = 5000;

export type RotateResult =
  | { status: "rotated"; userId: string; token: string; expiresAt: Date }
  | { status: "grace"; userId: string }
  | { status: "invalid" }
  | { status: "reuse_detected"; userId: string };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export function createRefreshTokenStore(db: Db, now: () => Date = () => new Date()) {
  type Executor = Pick<Db, "insert" | "update" | "select">;
  type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

  // Serializa rotação/revogação por usuário: nenhum sucessor sobrevive a uma revogação concorrente.
  const lockUser = (tx: Tx, userId: string) =>
    tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}::text))`);

  async function insertToken(
    tx: Executor,
    userId: string,
    familyId: string,
    userAgent: string | undefined,
  ): Promise<{ id: string; token: string; expiresAt: Date }> {
    const current = now();
    const token = newToken();
    const expiresAt = new Date(current.getTime() + REFRESH_TTL_MS);
    const [row] = await tx
      .insert(refreshTokens)
      .values({
        userId,
        familyId,
        tokenHash: sha256(token),
        expiresAt,
        userAgent: userAgent ?? null,
        createdAt: current,
      })
      .returning({ id: refreshTokens.id });
    return { id: row!.id, token, expiresAt };
  }

  return {
    async issue(userId: string, userAgent?: string, familyId?: string): Promise<{ token: string; expiresAt: Date }> {
      const { token, expiresAt } = await insertToken(db, userId, familyId ?? randomUUID(), userAgent);
      return { token, expiresAt };
    },

    /** Spec §6.2. A linha fica travada (FOR UPDATE) até o commit, então rotações concorrentes se serializam. */
    rotate(token: string, userAgent?: string): Promise<RotateResult> {
      return db.transaction(async (tx): Promise<RotateResult> => {
        const [probe] = await tx
          .select({ userId: refreshTokens.userId })
          .from(refreshTokens)
          .where(eq(refreshTokens.tokenHash, sha256(token)));
        if (!probe) return { status: "invalid" };
        await lockUser(tx, probe.userId);
        // releitura após o lock: enxerga revogações já commitadas (READ COMMITTED)
        const [row] = await tx
          .select()
          .from(refreshTokens)
          .where(eq(refreshTokens.tokenHash, sha256(token)))
          .for("update");
        const current = now();
        if (!row || row.revokedAt || row.expiresAt <= current) return { status: "invalid" };

        if (row.rotatedAt) {
          if (current.getTime() - row.rotatedAt.getTime() < GRACE_MS) {
            return { status: "grace", userId: row.userId };
          }
          await tx
            .update(refreshTokens)
            .set({ revokedAt: current })
            .where(and(eq(refreshTokens.familyId, row.familyId), isNull(refreshTokens.revokedAt)));
          return { status: "reuse_detected", userId: row.userId };
        }

        const next = await insertToken(tx, row.userId, row.familyId, userAgent);
        await tx
          .update(refreshTokens)
          .set({ rotatedAt: current, replacedBy: next.id })
          .where(eq(refreshTokens.id, row.id));
        return { status: "rotated", userId: row.userId, token: next.token, expiresAt: next.expiresAt };
      });
    },

    async revokeFamilyByToken(token: string): Promise<void> {
      await db.transaction(async (tx) => {
        const [probe] = await tx
          .select({ userId: refreshTokens.userId })
          .from(refreshTokens)
          .where(eq(refreshTokens.tokenHash, sha256(token)));
        if (!probe) return;
        await lockUser(tx, probe.userId);
        const [row] = await tx
          .select({ familyId: refreshTokens.familyId })
          .from(refreshTokens)
          .where(eq(refreshTokens.tokenHash, sha256(token)));
        if (!row) return;
        await tx
          .update(refreshTokens)
          .set({ revokedAt: now() })
          .where(and(eq(refreshTokens.familyId, row.familyId), isNull(refreshTokens.revokedAt)));
      });
    },

    /**
     * Apaga tokens expirados ou revogados há mais de 30 dias. Rotacionados ainda válidos ficam (reuse_detected
     * depende deles). Linhas já inúteis para rotate() (expiradas/revogadas) não precisam do advisory lock.
     * Só apaga linha referenciada por replaced_by junto com (ou depois de) quem a referencia; ORDER BY created_at
     * leva o antecessor antes do sucessor dentro de um lote (a FK é checada ao fim do statement).
     */
    async purgeStale(at: Date = now()): Promise<number> {
      const iso = new Date(at.getTime() - PURGE_RETENTION_MS).toISOString();
      let total = 0;
      for (;;) {
        const rows = await db.execute<{ n: number }>(sql`
          WITH stale AS (
            SELECT id, replaced_by, created_at FROM app.refresh_tokens
            WHERE expires_at < ${iso}::timestamptz OR revoked_at < ${iso}::timestamptz
          ), d AS (
            DELETE FROM app.refresh_tokens
            WHERE id IN (
              SELECT s.id FROM stale s
              WHERE NOT EXISTS (
                SELECT 1 FROM app.refresh_tokens r
                WHERE r.replaced_by = s.id AND r.id NOT IN (SELECT id FROM stale)
              )
              ORDER BY s.created_at
              LIMIT ${PURGE_BATCH}
            )
            RETURNING 1
          )
          SELECT count(*)::int AS n FROM d`);
        const n = Number(rows[0]?.n ?? 0);
        total += n;
        if (n < PURGE_BATCH) return total;
      }
    },

    /** Com `tx`, roda dentro da transação do chamador (o advisory lock vale até o commit dela). */
    async revokeAllForUser(userId: string, tx?: Tx): Promise<void> {
      const run = async (t: Tx) => {
        await lockUser(t, userId);
        await t
          .update(refreshTokens)
          .set({ revokedAt: now() })
          .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
      };
      await (tx ? run(tx) : db.transaction(run));
    },
  };
}

export type RefreshTokenStore = ReturnType<typeof createRefreshTokenStore>;
