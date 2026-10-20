import type {
  TransactionCreateInput,
  TransactionDto,
  TransactionListQuery,
  TransactionPage,
  TransactionType,
} from "@cash/shared";
import { isValidIsoDate } from "@cash/shared";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { categories, transactions } from "../../db/schema.js";
import { badRequest, notFound } from "../../http/errors.js";
import { getOwnedCategory, type CategoryRow } from "../categories/categories.service.js";

const TYPE_MISMATCH_MSG = "O tipo do lançamento não corresponde ao da categoria.";
const ARCHIVED_MSG = "Esta categoria está arquivada.";
const CURSOR_MSG = "Cursor inválido.";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UpdateInput = {
  type?: TransactionType | undefined;
  categoryId?: string | undefined;
  amountCents?: number | undefined;
  occurredOn?: string | undefined;
  description?: string | null | undefined;
};

const typeMismatch = () => badRequest("TYPE_MISMATCH", TYPE_MISMATCH_MSG);

function isCheckViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23514" || e?.cause?.code === "23514";
}

/** Descrição: trim; vazia/em branco vira null. */
const normalizeDescription = (d: string | null | undefined): string | null | undefined =>
  d === undefined ? undefined : d === null ? null : d.trim() === "" ? null : d.trim();

export const encodeCursor = (occurredOn: string, id: string): string =>
  Buffer.from(JSON.stringify([occurredOn, id])).toString("base64url");

export function decodeCursor(cursor: string): { occurredOn: string; id: string } {
  try {
    const v: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      Array.isArray(v) &&
      v.length === 2 &&
      typeof v[0] === "string" &&
      typeof v[1] === "string" &&
      isValidIsoDate(v[0]) &&
      UUID.test(v[1])
    ) {
      return { occurredOn: v[0], id: v[1] };
    }
  } catch {
    // cai no erro abaixo
  }
  throw badRequest("INVALID_CURSOR", CURSOR_MSG);
}

/** [início do mês, início do mês seguinte) como datas ISO, sem funções sobre a coluna. */
function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: `${month}-01`, to: `${next}-01` };
}

function assertUsable(category: CategoryRow, type: TransactionType): void {
  if (category.archivedAt !== null) throw badRequest("CATEGORY_ARCHIVED", ARCHIVED_MSG);
  if (category.type !== type) throw typeMismatch();
}

const dtoColumns = {
  id: transactions.id,
  type: transactions.type,
  amountCents: transactions.amountCents,
  occurredOn: transactions.occurredOn,
  description: transactions.description,
  category: { id: categories.id, name: categories.name, icon: categories.icon, color: categories.color },
};

export function createTransactionService(db: Db, now: () => Date = () => new Date()) {
  async function fetchDto(userId: string, id: string): Promise<TransactionDto> {
    const [row] = await db
      .select(dtoColumns)
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    if (!row) throw notFound();
    return row;
  }

  async function getOwned(userId: string, id: string) {
    if (!UUID.test(id)) throw notFound();
    const [row] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    if (!row) throw notFound();
    return row;
  }

  return {
    async list(userId: string, q: TransactionListQuery): Promise<TransactionPage> {
      const cursor = q.cursor ? decodeCursor(q.cursor) : undefined;
      const range = q.month ? monthRange(q.month) : undefined;
      const rows = await db
        .select(dtoColumns)
        .from(transactions)
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .where(
          and(
            eq(transactions.userId, userId),
            range && gte(transactions.occurredOn, range.from),
            range && lt(transactions.occurredOn, range.to),
            q.type ? eq(transactions.type, q.type) : undefined,
            q.categoryId ? eq(transactions.categoryId, q.categoryId) : undefined,
            cursor && sql`(${transactions.occurredOn}, ${transactions.id}) < (${cursor.occurredOn}::date, ${cursor.id}::uuid)`,
          ),
        )
        .orderBy(desc(transactions.occurredOn), desc(transactions.id))
        .limit(q.limit + 1);
      const items = rows.slice(0, q.limit);
      const last = items[items.length - 1];
      const nextCursor = rows.length > q.limit && last ? encodeCursor(last.occurredOn, last.id) : null;
      return { items, nextCursor };
    },

    async create(userId: string, input: TransactionCreateInput): Promise<TransactionDto> {
      const category = await getOwnedCategory(db, userId, input.categoryId);
      assertUsable(category, input.type);
      try {
        const [row] = await db
          .insert(transactions)
          .values({
            userId,
            categoryId: input.categoryId,
            type: input.type,
            amountCents: input.amountCents,
            occurredOn: input.occurredOn,
            description: normalizeDescription(input.description) ?? null,
          })
          .returning({ id: transactions.id });
        return await fetchDto(userId, row!.id);
      } catch (err) {
        if (isCheckViolation(err)) throw typeMismatch();
        throw err;
      }
    },

    async update(userId: string, id: string, input: UpdateInput): Promise<TransactionDto> {
      const current = await getOwned(userId, id);
      const type = input.type ?? current.type;
      const categoryChanged = input.categoryId !== undefined && input.categoryId !== current.categoryId;
      if (categoryChanged) {
        assertUsable(await getOwnedCategory(db, userId, input.categoryId!), type);
      } else if (input.type !== undefined && input.type !== current.type) {
        // só o tipo muda: a categoria atual (mesmo arquivada) precisa combinar
        const category = await getOwnedCategory(db, userId, current.categoryId);
        if (category.type !== type) throw typeMismatch();
      }
      const description = normalizeDescription(input.description);
      try {
        const [row] = await db
          .update(transactions)
          .set({
            ...(input.type !== undefined && { type: input.type }),
            ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
            ...(input.amountCents !== undefined && { amountCents: input.amountCents }),
            ...(input.occurredOn !== undefined && { occurredOn: input.occurredOn }),
            ...(description !== undefined && { description }),
            updatedAt: now(),
          })
          .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
          .returning({ id: transactions.id });
        if (!row) throw notFound(); // removido entre a checagem e o update
        return await fetchDto(userId, id);
      } catch (err) {
        if (isCheckViolation(err)) throw typeMismatch();
        throw err;
      }
    },

    async remove(userId: string, id: string): Promise<void> {
      if (!UUID.test(id)) throw notFound();
      const deleted = await db
        .delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
        .returning({ id: transactions.id });
      if (deleted.length === 0) throw notFound();
    },
  };
}

export type TransactionService = ReturnType<typeof createTransactionService>;
