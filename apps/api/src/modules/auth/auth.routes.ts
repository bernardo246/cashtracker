import { loginInput, registerInput, updateMeInput, type AuthResponse } from "@cash/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Env } from "../../config/env.js";
import { AppError, unauthorized } from "../../http/errors.js";
import { createWindowLimiter } from "../../http/window-limiter.js";
import { createOriginGuard } from "../../http/origin-guard.js";
import type { AuthService } from "./auth.service.js";
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from "./cookies.js";
import type { JwtService } from "./jwt.js";
import type { RefreshTokenStore } from "./refresh-tokens.js";

type Deps = { env: Env; auth: AuthService; jwt: JwtService; refreshTokens: RefreshTokenStore };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Chave do login: IP + e-mail normalizado (cai para o IP se o corpo não trouxer e-mail)
function bodyEmail(req: FastifyRequest): string | undefined {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : undefined;
}
const loginKey = (req: FastifyRequest): string => {
  const email = bodyEmail(req);
  return email === undefined ? req.ip : `${req.ip}:${email}`;
};

export function authRoutes(app: FastifyInstance, { env, auth, jwt, refreshTokens }: Deps, done: () => void): void {
  const originGuard = createOriginGuard(env);
  // teto por e-mail, independente do IP (20 por 15 min): cobre IPs rotativos
  const emailLimiter = createWindowLimiter({ max: 20, windowMs: 15 * MINUTE });
  const loginEmailLimit = (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const email = bodyEmail(req);
    if (!env.RATE_LIMIT_ENABLED || email === undefined) return Promise.resolve();
    const retryAfter = emailLimiter.hit(email);
    if (retryAfter === null) return Promise.resolve();
    void reply.header("retry-after", retryAfter);
    return Promise.reject(new AppError(429, "RATE_LIMITED", "Muitas tentativas. Tente novamente em instantes."));
  };
  const limit = (max: number, timeWindow: number, keyGenerator?: (req: FastifyRequest) => string) =>
    env.RATE_LIMIT_ENABLED
      ? { rateLimit: { max, timeWindow, hook: "preHandler" as const, ...(keyGenerator && { keyGenerator }) } }
      : {};

  const respond = async (userId: string, user: AuthResponse["user"]): Promise<AuthResponse> => ({
    accessToken: await jwt.sign(userId),
    user,
  });

  app.post("/auth/register", { onRequest: originGuard, config: limit(5, HOUR) }, async (req, reply) => {
    const user = await auth.register(registerInput.parse(req.body));
    const rt = await refreshTokens.issue(user.id, req.headers["user-agent"]);
    setRefreshCookie(reply, rt.token, rt.expiresAt, env);
    return reply.status(201).send(await respond(user.id, user));
  });

  app.post("/auth/login", { onRequest: originGuard, preHandler: loginEmailLimit, config: limit(5, MINUTE, loginKey) }, async (req, reply) => {
    const user = await auth.login(loginInput.parse(req.body));
    const rt = await refreshTokens.issue(user.id, req.headers["user-agent"]);
    setRefreshCookie(reply, rt.token, rt.expiresAt, env);
    return respond(user.id, user);
  });

  app.post("/auth/refresh", { onRequest: originGuard, config: limit(30, MINUTE) }, async (req, reply) => {
    const invalid = () => {
      clearRefreshCookie(reply, env);
      return unauthorized("INVALID_REFRESH", "Sessão expirada");
    };
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) throw invalid();

    const result = await refreshTokens.rotate(token, req.headers["user-agent"]);
    switch (result.status) {
      case "rotated":
        setRefreshCookie(reply, result.token, result.expiresAt, env);
        return respond(result.userId, await auth.getUser(result.userId));
      case "grace":
        return respond(result.userId, await auth.getUser(result.userId));
      case "reuse_detected":
        req.log.warn({ userId: result.userId, event: "refresh_token_reuse" }, "reuso de refresh token detectado; família revogada");
        throw invalid();
      case "invalid":
        throw invalid();
    }
  });

  app.post("/auth/logout", { onRequest: originGuard }, async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) await refreshTokens.revokeFamilyByToken(token);
    clearRefreshCookie(reply, env);
    return reply.status(204).send();
  });

  app.get("/me", { onRequest: app.authenticate }, async (req) => auth.getUser(req.userId));

  app.patch("/me", { onRequest: app.authenticate }, async (req) => {
    const { name } = updateMeInput.parse(req.body);
    return auth.updateName(req.userId, name);
  });

  done();
}
