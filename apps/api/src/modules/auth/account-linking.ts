import { and, eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { oauthAccounts, users } from "../../db/schema.js";
import { seedDefaultCategories } from "../categories/defaults.js";
import { isUniqueViolation } from "./auth.service.js";
import type { GoogleProfile } from "./google-client.js";
import type { RefreshTokenStore } from "./refresh-tokens.js";

const PROVIDER = "google";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type UserRow = typeof users.$inferSelect;
type Outcome = { userId: string; created: boolean };
type Revoker = Pick<RefreshTokenStore, "revokeAllForUser">;

/** Preenche nome/avatar só se estiverem vazios (spec §6.5). */
async function fillEmptyProfile(tx: Tx, user: UserRow, profile: GoogleProfile): Promise<void> {
  const patch: Partial<Pick<UserRow, "name" | "avatarUrl">> = {};
  if (user.name.trim() === "") patch.name = profile.name;
  if (!user.avatarUrl && profile.picture) patch.avatarUrl = profile.picture;
  if (Object.keys(patch).length > 0) {
    await tx.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, user.id));
  }
}

/** Árvore da spec §6.5, numa única transação. */
function attempt(db: Db, profile: GoogleProfile, email: string, refreshStore: Revoker): Promise<Outcome> {
  return db.transaction(async (tx): Promise<Outcome> => {
    const [linked] = await tx
      .select({ user: users })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(and(eq(oauthAccounts.provider, PROVIDER), eq(oauthAccounts.providerUserId, profile.sub)));
    if (linked) {
      await fillEmptyProfile(tx, linked.user, profile);
      return { userId: linked.user.id, created: false };
    }

    // NO KEY UPDATE (e não UPDATE): serializa vínculos concorrentes do mesmo usuário sem bloquear o
    // KEY SHARE que o INSERT em refresh_tokens (FK) pega — evita deadlock com rotate(), que segura o
    // advisory lock do usuário enquanto insere o sucessor.
    const [existing] = await tx.select().from(users).where(eq(users.email, email)).for("no key update");
    if (existing) {
      await tx.insert(oauthAccounts).values({ userId: existing.id, provider: PROVIDER, providerUserId: profile.sub });
      if (!existing.emailVerified) {
        // quem cadastrou o e-mail sem prová-lo perde a senha; o dono real (Google) assume a conta
        await tx
          .update(users)
          .set({ passwordHash: null, emailVerified: true, updatedAt: new Date() })
          .where(eq(users.id, existing.id));
        // na mesma transação: senha apagada e sessões revogadas são atômicas (sem janela em que
        // uma falha deixe sessões antigas vivas com o ramo "já vinculado" nos logins seguintes)
        await refreshStore.revokeAllForUser(existing.id, tx);
      }
      return { userId: existing.id, created: false };
    }

    const [created] = await tx
      .insert(users)
      .values({
        email,
        name: profile.name,
        avatarUrl: profile.picture ?? null,
        passwordHash: null,
        emailVerified: true,
      })
      .returning({ id: users.id });
    await tx.insert(oauthAccounts).values({ userId: created!.id, provider: PROVIDER, providerUserId: profile.sub });
    await seedDefaultCategories(tx, created!.id);
    return { userId: created!.id, created: true };
  });
}

/** O chamador emite a nova sessão só depois do retorno (após o commit), então ela sobrevive à revogação. */
export async function linkGoogleAccount(db: Db, profile: GoogleProfile, refreshStore: Revoker): Promise<Outcome> {
  const email = profile.email.trim().toLowerCase();
  try {
    return await attempt(db, profile, email, refreshStore);
  } catch (err) {
    // corrida com outro callback do mesmo sub/e-mail: a transação concorrente já commitou,
    // então a releitura cai no ramo "já vinculado"
    if (!isUniqueViolation(err)) throw err;
    return attempt(db, profile, email, refreshStore);
  }
}
