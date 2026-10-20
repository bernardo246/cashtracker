import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { refreshTokens } from "../../db/schema.js";

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GRACE_MS = 30_000;

export type RotateResult =
  | { status: "rotated"; userId: string; token: string; expiresAt: Date }
  | { status: "grace"; userId: string }
  | { status: "invalid" }
  | { status: "reuse_detected"; userId: string };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export function createRefreshTokenStore(db: Db, now: () => Date = () => new Date()) {
  type Executor = Pick<Db, "insert" | "update" | "select">;

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
      const [row] = await db
        .select({ familyId: refreshTokens.familyId })
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, sha256(token)));
      if (!row) return;
      await db
        .update(refreshTokens)
        .set({ revokedAt: now() })
        .where(and(eq(refreshTokens.familyId, row.familyId), isNull(refreshTokens.revokedAt)));
    },

    async revokeAllForUser(userId: string): Promise<void> {
      await db
        .update(refreshTokens)
        .set({ revokedAt: now() })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
    },
  };
}

export type RefreshTokenStore = ReturnType<typeof createRefreshTokenStore>;
