import { z } from "zod";
import { isMonthKey, isValidIsoDate } from "../dates.js";
import { MAX_AMOUNT_CENTS } from "../money.js";
import type { TransactionType } from "../categories.js";
import { transactionTypeSchema, type CategoryDto } from "./categories.js";

export const monthSchema = z.string().refine(isMonthKey, { message: "Mês inválido (use AAAA-MM)" });
const dateSchema = z.string().refine(isValidIsoDate, { message: "Data inválida (use AAAA-MM-DD)" });
const amountSchema = z.number().int().min(1).max(MAX_AMOUNT_CENTS);
const descriptionSchema = z.string().trim().max(140).nullable();

export const transactionCreateInput = z.strictObject({
  type: transactionTypeSchema,
  categoryId: z.uuid(),
  amountCents: amountSchema,
  occurredOn: dateSchema,
  description: descriptionSchema.optional(),
});

export const transactionUpdateInput = z
  .strictObject({
    type: transactionTypeSchema.optional(),
    categoryId: z.uuid().optional(),
    amountCents: amountSchema.optional(),
    occurredOn: dateSchema.optional(),
    description: descriptionSchema.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Informe ao menos um campo" });

export const transactionListQuery = z.strictObject({
  month: monthSchema.optional(),
  type: transactionTypeSchema.optional(),
  categoryId: z.uuid().optional(),
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type TransactionCreateInput = z.infer<typeof transactionCreateInput>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateInput>;
export type TransactionListQuery = z.infer<typeof transactionListQuery>;

export interface TransactionDto {
  id: string;
  type: TransactionType;
  amountCents: number;
  occurredOn: string;
  description: string | null;
  category: Pick<CategoryDto, "id" | "name" | "icon" | "color">;
}
export interface TransactionPage {
  items: TransactionDto[];
  nextCursor: string | null;
}
