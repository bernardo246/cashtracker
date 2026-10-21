import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const app = pgSchema("app");

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = app.table(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("users_email_uq").on(t.email)],
);

export const oauthAccounts = app.table(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [unique("oauth_accounts_provider_uq").on(t.provider, t.providerUserId), index("oauth_accounts_user_idx").on(t.userId)],
);

export const refreshTokens = app.table(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: tz("expires_at").notNull(),
    revokedAt: tz("revoked_at"),
    replacedBy: uuid("replaced_by").references((): AnyPgColumn => refreshTokens.id),
    rotatedAt: tz("rotated_at"),
    userAgent: text("user_agent"),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [index("refresh_tokens_family_idx").on(t.familyId), index("refresh_tokens_user_idx").on(t.userId)],
);

export const passwordResetTokens = app.table(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: tz("expires_at").notNull(),
    usedAt: tz("used_at"),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

export const categories = app.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["income", "expense"] }).notNull(),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    archivedAt: tz("archived_at"),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_user_type_name_uq").on(t.userId, t.type, sql`lower(${t.name})`)],
);

export const transactions = app.table(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    type: text("type", { enum: ["income", "expense"] }).notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    description: text("description"),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.occurredOn.desc(), t.id.desc()),
    index("transactions_category_idx").on(t.categoryId),
  ],
);
