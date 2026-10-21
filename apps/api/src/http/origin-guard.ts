import type { FastifyRequest } from "fastify";
import type { Env } from "../config/env.js";
import { AppError } from "./errors.js";

/** CSRF (spec §6.3): POSTs de /auth/* exigem Origin igual a APP_URL. */
export function createOriginGuard(env: Env) {
  const allowed = new URL(env.APP_URL).origin;
  return function originGuard(req: FastifyRequest): Promise<void> {
    // hook de Fastify com 1 argumento precisa devolver Promise
    if (req.headers.origin !== allowed) {
      return Promise.reject(new AppError(403, "FORBIDDEN_ORIGIN", "Origem não permitida"));
    }
    return Promise.resolve();
  };
}
