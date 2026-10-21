import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { MemorySender } from "../../email/memory.js";

const query = z.strictObject({ to: z.email() });

/** Somente com EMAIL_PROVIDER=memory (NODE_ENV=test): o E2E lê o último e-mail enviado. */
export const testMailboxRoutes: FastifyPluginAsync<{ mailbox: MemorySender }> = (app, { mailbox }) => {
  app.get("/__test/last-email", (req, reply) => {
    const parsed = query.safeParse(req.query);
    const msg = parsed.success ? mailbox.last(parsed.data.to) : undefined;
    if (!msg) return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Nenhum e-mail", requestId: req.id } });
    return reply.send({ to: msg.to, subject: msg.subject, text: msg.text });
  });
  return Promise.resolve();
};
