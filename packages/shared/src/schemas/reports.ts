import { z } from "zod";
import { transactionTypeSchema } from "./categories.js";
import { monthSchema } from "./transactions.js";

export const byCategoryQuery = z
  .strictObject({
    type: transactionTypeSchema,
    month: monthSchema.optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .refine((v) => (v.month === undefined) !== (v.year === undefined), {
    message: "Informe month ou year (apenas um)",
  });

export const monthlyQuery = z.strictObject({
  months: z.coerce.number().int().min(1).max(24).default(12),
});

export type ByCategoryQuery = z.infer<typeof byCategoryQuery>;
export type MonthlyQuery = z.infer<typeof monthlyQuery>;

export interface ByCategoryReport {
  period: { month?: string; year?: number };
  totalCents: number;
  items: {
    categoryId: string;
    name: string;
    icon: string;
    color: string;
    archived: boolean;
    totalCents: number;
    share: number;
  }[];
}
export interface MonthlyReport {
  items: { month: string; incomeCents: number; expenseCents: number; balanceCents: number }[];
}
