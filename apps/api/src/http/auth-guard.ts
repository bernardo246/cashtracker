import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { unauthorized } from "./errors.js";
import type { JwtService } from "../modules/auth/jwt.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    userId: string;
  }
}

export function registerAuthGuard(app: FastifyInstance, jwt: JwtService): void {
  app.decorateRequest("userId", "");
  app.decorate("authenticate", async (req: FastifyRequest) => {
    const header = req.headers.authorization;
    const match = header ? /^Bearer (.+)$/.exec(header) : null;
    if (!match) throw unauthorized("INVALID_TOKEN", "Sessão expirada");
    req.userId = (await jwt.verify(match[1]!)).userId;
  });
}
