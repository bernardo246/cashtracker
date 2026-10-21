import { z } from "zod";
import { CATEGORY_COLORS, CATEGORY_ICONS, type TransactionType } from "../categories.js";

export const transactionTypeSchema = z.enum(["income", "expense"]);
const nameSchema = z.string().trim().min(1).max(40);
const iconSchema = z.enum(CATEGORY_ICONS);
const colorSchema = z.enum(CATEGORY_COLORS);

export const categoryCreateInput = z.strictObject({
  name: nameSchema,
  type: transactionTypeSchema,
  icon: iconSchema,
  color: colorSchema,
});

export const categoryUpdateInput = z
  .strictObject({
    name: nameSchema.optional(),
    icon: iconSchema.optional(),
    color: colorSchema.optional(),
    archived: z.boolean().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Informe ao menos um campo" });

export type CategoryCreateInput = z.infer<typeof categoryCreateInput>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateInput>;

export interface CategoryDto {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  archived: boolean;
}
