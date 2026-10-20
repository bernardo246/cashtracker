import { categoryCreateInput, categoryUpdateInput, transactionTypeSchema } from "@cash/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import { authedRateLimit } from "../../http/rate-limits.js";
import type { CategoryService } from "./categories.service.js";

type Deps = { env: Env; categories: CategoryService };

const listQuery = z.strictObject({
  type: transactionTypeSchema.optional(),
  includeArchived: z.enum(["true", "false"]).optional(),
});

export function categoryRoutes(app: FastifyInstance, { env, categories }: Deps, done: () => void): void {
  // authenticate antes do rate limit (preHandler): a chave usa req.userId
  const opts = { preHandler: [app.authenticate], config: authedRateLimit(env) };
  // id malformado (não uuid) vira 404 em getOwnedCategory, igual a um id inexistente
  const idOf = (req: { params: unknown }) => (req.params as { id: string }).id;

  app.get("/categories", opts, async (req) => {
    const q = listQuery.parse(req.query);
    return categories.list(req.userId, { type: q.type, includeArchived: q.includeArchived === "true" });
  });

  app.post("/categories", opts, async (req, reply) => {
    const created = await categories.create(req.userId, categoryCreateInput.parse(req.body));
    return reply.status(201).send(created);
  });

  app.get("/categories/:id", opts, async (req) => categories.get(req.userId, idOf(req)));

  app.patch("/categories/:id", opts, async (req) =>
    categories.update(req.userId, idOf(req), categoryUpdateInput.parse(req.body)),
  );

  app.delete("/categories/:id", opts, async (req, reply) => {
    await categories.remove(req.userId, idOf(req));
    return reply.status(204).send();
  });

  done();
}
