import type { CategoryCreateInput, CategoryDto, CategoryUpdateInput, TransactionType } from "@cash/shared";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { categories, transactions } from "../../db/schema.js";
import { conflict, notFound } from "../../http/errors.js";
import { isUniqueViolation } from "../auth/auth.service.js";

export type CategoryRow = typeof categories.$inferSelect;

const EXISTS_MSG = "Já existe uma categoria com esse nome.";
const IN_USE_MSG = "Esta categoria tem lançamentos. Arquive-a em vez de excluir.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isForeignKeyViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23503" || e?.cause?.code === "23503";
}

export const toCategoryDto = (r: CategoryRow): CategoryDto => ({
  id: r.id,
  name: r.name,
  type: r.type,
  icon: r.icon,
  color: r.color,
  archived: r.archivedAt !== null,
});

/** 404 se a categoria não existe, é de outro usuário ou o id não é um uuid (não vaza existência). */
export async function getOwnedCategory(db: Db, userId: string, id: string): Promise<CategoryRow> {
  if (!UUID.test(id)) throw notFound();
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  if (!row) throw notFound();
  return row;
}

export function createCategoryService(db: Db, now: () => Date = () => new Date()) {
  return {
    async list(userId: string, opts: { type?: TransactionType; includeArchived: boolean }): Promise<CategoryDto[]> {
      const rows = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.userId, userId),
            opts.type && eq(categories.type, opts.type),
            opts.includeArchived ? undefined : isNull(categories.archivedAt),
          ),
        )
        .orderBy(asc(sql`lower(${categories.name})`), asc(categories.id));
      return rows.map(toCategoryDto);
    },

    async get(userId: string, id: string): Promise<CategoryDto> {
      return toCategoryDto(await getOwnedCategory(db, userId, id));
    },

    async create(userId: string, input: CategoryCreateInput): Promise<CategoryDto> {
      try {
        const [row] = await db.insert(categories).values({ userId, ...input }).returning();
        return toCategoryDto(row!);
      } catch (err) {
        if (isUniqueViolation(err)) throw conflict("CATEGORY_EXISTS", EXISTS_MSG);
        throw err;
      }
    },

    async update(userId: string, id: string, input: CategoryUpdateInput): Promise<CategoryDto> {
      await getOwnedCategory(db, userId, id);
      const { archived, ...rest } = input;
      const patch = { ...rest, ...(archived !== undefined && { archivedAt: archived ? now() : null }) };
      try {
        const [row] = await db
          .update(categories)
          .set(patch)
          .where(and(eq(categories.id, id), eq(categories.userId, userId)))
          .returning();
        if (!row) throw notFound(); // removida entre a checagem e o update
        return toCategoryDto(row);
      } catch (err) {
        if (isUniqueViolation(err)) throw conflict("CATEGORY_EXISTS", EXISTS_MSG);
        throw err;
      }
    },

    async remove(userId: string, id: string): Promise<void> {
      await getOwnedCategory(db, userId, id);
      const [used] = await db
        .select({ one: sql<number>`1` })
        .from(transactions)
        .where(eq(transactions.categoryId, id))
        .limit(1);
      if (used) throw conflict("CATEGORY_IN_USE", IN_USE_MSG);
      try {
        await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
      } catch (err) {
        // lançamento criado entre a checagem e o delete: a FK RESTRICT protege
        if (isForeignKeyViolation(err)) throw conflict("CATEGORY_IN_USE", IN_USE_MSG);
        throw err;
      }
    },
  };
}

export type CategoryService = ReturnType<typeof createCategoryService>;
