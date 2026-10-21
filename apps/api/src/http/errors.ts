import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = () => new AppError(404, "NOT_FOUND", "Não encontrado.");
export const conflict = (code: string, msg: string) => new AppError(409, code, msg);
export const badRequest = (code: string, msg: string, fields?: Record<string, string>) =>
  new AppError(400, code, msg, fields);
export const unauthorized = (code: string, msg: string) => new AppError(401, code, msg);

function zodFields(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join(".");
    fields[key] ??= issue.message;
  }
  return fields;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((req, reply) => {
    const { status, code, message } = notFound();
    return reply.status(status).send({ error: { code, message, requestId: req.id } });
  });

  app.setErrorHandler((err, req, reply) => {
    const requestId = req.id;
    const send = (status: number, code: string, message: string, fields?: Record<string, string>) =>
      reply.status(status).send({ error: { code, message, ...(fields && { fields }), requestId } });

    if (err instanceof ZodError) {
      return send(400, "VALIDATION_ERROR", "Dados inválidos.", zodFields(err));
    }
    if (err instanceof AppError) {
      return send(err.status, err.code, err.message, err.fields);
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 429) {
      return send(429, "RATE_LIMITED", "Muitas tentativas. Tente novamente em instantes.");
    }
    if (status !== undefined && status >= 400 && status < 500) {
      // erros 4xx do próprio Fastify (JSON malformado, 413, 415...): culpa do cliente, não é erro do servidor
      req.log.info({ statusCode: status }, "requisição rejeitada");
      return send(status, "BAD_REQUEST", "Requisição inválida.");
    }
    req.log.error({ err }, "erro inesperado");
    return send(500, "INTERNAL_ERROR", "Algo deu errado. Tente novamente.");
  });
}
