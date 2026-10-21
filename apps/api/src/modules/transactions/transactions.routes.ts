import { transactionCreateInput, transactionListQuery, transactionUpdateInput } from "@cash/shared";
import type { FastifyInstance } from "fastify";
import type { Env } from "../../config/env.js";
import { authedRateLimit } from "../../http/rate-limits.js";
import type { TransactionService } from "./transactions.service.js";

type Deps = { env: Env; transactions: TransactionService };

export function transactionRoutes(app: FastifyInstance, { env, transactions }: Deps, done: () => void): void {
  // authenticate antes do rate limit (preHandler): a chave usa req.userId
  const opts = { preHandler: [app.authenticate], config: authedRateLimit(env) };
  // id malformado (não uuid) vira 404 no service, igual a um id inexistente
  const idOf = (req: { params: unknown }) => (req.params as { id: string }).id;

  app.get("/transactions", opts, async (req) =>
    transactions.list(req.userId, transactionListQuery.parse(req.query)),
  );

  app.post("/transactions", opts, async (req, reply) => {
    const created = await transactions.create(req.userId, transactionCreateInput.parse(req.body));
    return reply.status(201).send(created);
  });

  app.patch("/transactions/:id", opts, async (req) =>
    transactions.update(req.userId, idOf(req), transactionUpdateInput.parse(req.body)),
  );

  app.delete("/transactions/:id", opts, async (req, reply) => {
    await transactions.remove(req.userId, idOf(req));
    return reply.status(204).send();
  });

  done();
}
