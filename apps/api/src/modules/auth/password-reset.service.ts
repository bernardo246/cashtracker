import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { passwordResetTokens, users } from "../../db/schema.js";
import { badRequest } from "../../http/errors.js";
import { resetPasswordEmail } from "../../email/templates.js";
import type { EmailSender } from "../../email/email-sender.js";
import { hashPassword } from "./passwords.js";
import type { RefreshTokenStore } from "./refresh-tokens.js";

const TOKEN_TTL_MS = 30 * 60_000;
const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

type Deps = {
  db: Db;
  emailSender: EmailSender;
  refreshTokens: RefreshTokenStore;
  appUrl: string;
  now?: () => Date;
};

export function createPasswordResetService({ db, emailSender, refreshTokens, appUrl, now = () => new Date() }: Deps) {
  return {
    /**
     * Fluxo completo (busca, token, envio). Roda fora do caminho da resposta (a rota não espera),
     * então o tempo de resposta não depende de o e-mail existir. Rejeita se o envio falhar.
     */
    async requestReset(email: string): Promise<void> {
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (!user) return;

      const token = randomBytes(32).toString("base64url");
      const at = now();
      await db.transaction(async (tx) => {
        await tx
          .update(passwordResetTokens)
          .set({ usedAt: at })
          .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
        await tx
          .insert(passwordResetTokens)
          .values({ userId: user.id, tokenHash: sha256(token), expiresAt: new Date(at.getTime() + TOKEN_TTL_MS) });
      });

      const link = `${appUrl.replace(/\/+$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}`;
      await emailSender.send({ to: email, ...resetPasswordEmail(link) });
    },

    async resetPassword(token: string, password: string): Promise<void> {
      const passwordHash = await hashPassword(password);
      const at = now();
      await db.transaction(async (tx) => {
        const [row] = await tx
          .update(passwordResetTokens)
          .set({ usedAt: at })
          .where(
            and(
              eq(passwordResetTokens.tokenHash, sha256(token)),
              isNull(passwordResetTokens.usedAt),
              gt(passwordResetTokens.expiresAt, at), // relógio injetado
            ),
          )
          .returning({ userId: passwordResetTokens.userId });
        if (!row) throw badRequest("INVALID_RESET_TOKEN", "Link inválido ou expirado");
        await tx.update(users).set({ passwordHash, emailVerified: true, updatedAt: at }).where(eq(users.id, row.userId));
        // na mesma transação: ou troca a senha e revoga as sessões, ou nada muda
        await refreshTokens.revokeAllForUser(row.userId, tx);
      });
    },
  };
}

export type PasswordResetService = ReturnType<typeof createPasswordResetService>;
