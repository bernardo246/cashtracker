import type { LoginInput, RegisterInput, UserDto } from "@cash/shared";
import { eq, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { oauthAccounts, users } from "../../db/schema.js";
import { AppError, conflict, notFound, unauthorized } from "../../http/errors.js";
import { seedDefaultCategories } from "../categories/defaults.js";
import { hashPassword, verifyDummy, verifyPassword } from "./passwords.js";

type UserRow = typeof users.$inferSelect;

export function toUserDto(user: UserRow, hasGoogle: boolean): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    hasPassword: user.passwordHash !== null,
    hasGoogle,
  };
}

const EMAIL_TAKEN = "Este e-mail já tem uma conta. Entre ou use 'Esqueceu a senha'";

// drizzle encapsula o erro do driver em `cause`
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export function createAuthService(db: Db, now: () => Date = () => new Date()) {
  async function hasGoogle(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ one: sql<number>`1` })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .limit(1);
    return Boolean(row);
  }

  return {
    async register(input: RegisterInput): Promise<UserDto> {
      const passwordHash = await hashPassword(input.password);
      try {
        const user = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(users)
            .values({ email: input.email, name: input.name, passwordHash, emailVerified: false })
            .returning();
          await seedDefaultCategories(tx, created!.id);
          return created!;
        });
        return toUserDto(user, false);
      } catch (err) {
        if (isUniqueViolation(err)) throw conflict("EMAIL_TAKEN", EMAIL_TAKEN);
        throw err;
      }
    },

    async login(input: LoginInput): Promise<UserDto> {
      const [user] = await db.select().from(users).where(eq(users.email, input.email));
      if (!user) {
        await verifyDummy();
        throw unauthorized("INVALID_CREDENTIALS", "E-mail ou senha incorretos");
      }
      if (user.passwordHash === null) {
        throw new AppError(
          401,
          "USE_GOOGLE",
          "Esta conta usa o Google. Entre com o Google ou defina uma senha em 'Esqueceu a senha'",
        );
      }
      if (!(await verifyPassword(user.passwordHash, input.password))) {
        throw unauthorized("INVALID_CREDENTIALS", "E-mail ou senha incorretos");
      }
      return toUserDto(user, await hasGoogle(user.id));
    },

    async getUser(userId: string): Promise<UserDto> {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) throw unauthorized("INVALID_TOKEN", "Sessão expirada");
      return toUserDto(user, await hasGoogle(userId));
    },

    async updateName(userId: string, name: string): Promise<UserDto> {
      const [user] = await db.update(users).set({ name, updatedAt: now() }).where(eq(users.id, userId)).returning();
      if (!user) throw notFound();
      return toUserDto(user, await hasGoogle(userId));
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
