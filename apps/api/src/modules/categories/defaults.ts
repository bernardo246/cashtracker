import { DEFAULT_CATEGORIES } from "@cash/shared";
import type { Db } from "../../db/client.js";
import { categories } from "../../db/schema.js";

type Executor = Pick<Db, "insert">;

export async function seedDefaultCategories(tx: Executor, userId: string): Promise<void> {
  await tx.insert(categories).values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })));
}
