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
     * Cria o token e dispara o e-mail. Devolve a promessa de envio (já com erro tratado por `onSendError`)
     * para a rota ignorá-la e os testes poderem aguardá-la; `sent` é null se o usuário não existe.
     */
    async requestReset(email: string, onSendError: (err: unknown) => void): Promise<{ sent: Promise<void> | null }> {
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      // mesmo trabalho (token + hash) quando o e-mail não existe, para não vazar por tempo
      const token = randomBytes(32).toString("base64url");
      const tokenHash = sha256(token);
      if (!user) return { sent: null };

      const at = now();
      await db.transaction(async (tx) => {
        await tx
          .update(passwordResetTokens)
          .set({ usedAt: at })
          .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
        await tx
          .insert(passwordResetTokens)
          .values({ userId: user.id, tokenHash, expiresAt: new Date(at.getTime() + TOKEN_TTL_MS) });
      });

      const link = `${appUrl.replace(/\/+$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}`;
      // objeto-wrapper: devolver a promessa direto de uma função async a faria ser aguardada
      return { sent: emailSender.send({ to: email, ...resetPasswordEmail(link) }).catch(onSendError) };
    },

    async resetPassword(token: string, password: string): Promise<void> {
      const passwordHash = await hashPassword(password);
      const at = now();
      const userId = await db.transaction(async (tx) => {
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
        return row.userId;
      });
      await refreshTokens.revokeAllForUser(userId);
    },
  };
}

export type PasswordResetService = ReturnType<typeof createPasswordResetService>;
