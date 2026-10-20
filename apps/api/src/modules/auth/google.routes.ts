import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Env } from "../../config/env.js";
import type { Db } from "../../db/client.js";
import { linkGoogleAccount } from "./account-linking.js";
import { setRefreshCookie } from "./cookies.js";
import { GoogleAuthError, type GoogleClient } from "./google-client.js";
import { createPkcePair, randomToken } from "./pkce.js";
import type { RefreshTokenStore } from "./refresh-tokens.js";

type Deps = { env: Env; db: Db; google: GoogleClient; refreshTokens: RefreshTokenStore };
type OauthState = { state: string; nonce: string; verifier: string };

const OAUTH_COOKIE = "g_oauth";

// O path inclui /api porque é o que o navegador vê (rewrite da Vercel remove o prefixo no backend)
const cookieOptions = (env: Env) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/api/auth/google",
  secure: env.NODE_ENV === "production",
});

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function parseOauthState(raw: string): OauthState | null {
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof OauthState, unknown>>;
    if (typeof v.state === "string" && typeof v.nonce === "string" && typeof v.verifier === "string") {
      return { state: v.state, nonce: v.nonce, verifier: v.verifier };
    }
  } catch {
    // cai no null abaixo
  }
  return null;
}

const queryString = (query: unknown, key: string): string | undefined => {
  const v = (query as Record<string, unknown> | undefined)?.[key];
  return typeof v === "string" && v !== "" ? v : undefined;
};

export function googleRoutes(app: FastifyInstance, { env, db, google, refreshTokens }: Deps, done: () => void): void {
  // GETs são navegações de topo (vindas do front ou do Google): sem originGuard
  app.get("/auth/google", async (_req, reply) => {
    const state = randomToken();
    const nonce = randomToken();
    const { verifier, challenge } = createPkcePair();
    const value: OauthState = { state, nonce, verifier };
    reply.setCookie(OAUTH_COOKIE, JSON.stringify(value), { ...cookieOptions(env), signed: true, maxAge: 300 });
    return reply.redirect(google.buildAuthUrl({ state, nonce, challenge }), 302);
  });

  app.get("/auth/google/callback", async (req: FastifyRequest, reply: FastifyReply) => {
    // passo 6: lê e apaga g_oauth em qualquer desfecho (uso único)
    const raw = req.cookies[OAUTH_COOKIE];
    reply.clearCookie(OAUTH_COOKIE, cookieOptions(env));

    // nunca registrar code, state, verifier, nonce nem id_token: só o motivo
    const fail = (reason: string) => {
      req.log.warn({ reason }, "google_login_failed");
      return reply.redirect(`${env.APP_URL}/login?erro=google`, 302);
    };

    if (queryString(req.query, "error")) return fail("provider_error");
    if (!raw) return fail("missing_oauth_cookie");
    const unsigned = req.unsignCookie(raw);
    const saved = unsigned.valid && unsigned.value !== null ? parseOauthState(unsigned.value) : null;
    if (!saved) return fail("bad_oauth_cookie");

    const code = queryString(req.query, "code");
    const state = queryString(req.query, "state");
    if (!code || !state) return fail("missing_code_or_state");
    if (!sameSecret(state, saved.state)) return fail("state_mismatch");

    try {
      const { idToken } = await google.exchangeCode(code, saved.verifier);
      const profile = await google.verifyIdToken(idToken, saved.nonce);
      const { userId } = await linkGoogleAccount(db, profile, refreshTokens);
      const rt = await refreshTokens.issue(userId, req.headers["user-agent"]);
      setRefreshCookie(reply, rt.token, rt.expiresAt, env);
      return reply.redirect(`${env.APP_URL}/visao-geral`, 302);
    } catch (err) {
      if (err instanceof GoogleAuthError) return fail(err.reason);
      req.log.error({ err: err instanceof Error ? err.name : "erro" }, "falha inesperada no login com Google");
      return fail("internal_error");
    }
  });

  done();
}
