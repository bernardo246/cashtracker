import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Env } from "../../config/env.js";

export type GoogleEndpoints = { authUrl: string; tokenUrl: string; jwksUrl: string; issuers: string[] };

export const DEFAULT_GOOGLE_ENDPOINTS: GoogleEndpoints = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
  issuers: ["https://accounts.google.com", "accounts.google.com"],
};

export type GoogleProfile = { sub: string; email: string; name: string; picture?: string };

/** Falha do fluxo Google; `reason` é um código curto, seguro para log (nunca contém tokens). */
export class GoogleAuthError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "GoogleAuthError";
  }
}

const TOKEN_TIMEOUT_MS = 10_000;

type GoogleEnv = Pick<Env, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "GOOGLE_REDIRECT_URI">;

export function createGoogleClient(
  env: GoogleEnv,
  endpoints: GoogleEndpoints = DEFAULT_GOOGLE_ENDPOINTS,
  fetchFn: typeof fetch = fetch,
  now: () => Date = () => new Date(),
) {
  // criado uma vez: o jose mantém o JWKS em cache e só rebusca quando aparece um kid desconhecido
  const jwks = createRemoteJWKSet(new URL(endpoints.jwksUrl));

  return {
    buildAuthUrl({ state, nonce, challenge }: { state: string; nonce: string; challenge: string }): string {
      const url = new URL(endpoints.authUrl);
      url.search = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "select_account",
      }).toString();
      return url.toString();
    },

    async exchangeCode(code: string, verifier: string): Promise<{ idToken: string }> {
      let res: Response;
      try {
        res = await fetchFn(endpoints.tokenUrl, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
          body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            code,
            code_verifier: verifier,
            grant_type: "authorization_code",
            redirect_uri: env.GOOGLE_REDIRECT_URI,
          }),
          signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
        });
      } catch {
        throw new GoogleAuthError("token_exchange_failed");
      }
      if (!res.ok) throw new GoogleAuthError("token_exchange_failed");
      const body = (await res.json().catch(() => null)) as { id_token?: unknown } | null;
      if (typeof body?.id_token !== "string") throw new GoogleAuthError("token_exchange_failed");
      return { idToken: body.id_token };
    },

    async verifyIdToken(idToken: string, nonce: string): Promise<GoogleProfile> {
      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(idToken, jwks, {
          issuer: endpoints.issuers,
          audience: env.GOOGLE_CLIENT_ID,
          algorithms: ["RS256"],
          currentDate: now(),
        }));
      } catch {
        throw new GoogleAuthError("id_token_invalid");
      }
      // email_verified estritamente boolean: o Google o emite como boolean no id_token;
      // aceitar a string "true" alargaria a superfície sem necessidade
      const { sub, email, email_verified, name, picture } = payload;
      if (
        payload.nonce !== nonce ||
        email_verified !== true ||
        typeof sub !== "string" ||
        sub === "" ||
        typeof email !== "string" ||
        email.trim() === ""
      ) {
        throw new GoogleAuthError("id_token_invalid");
      }
      return {
        sub,
        email,
        // users.name é NOT NULL: sem nome no perfil, usa a parte local do e-mail
        name: typeof name === "string" && name.trim() !== "" ? name.trim() : email.trim().split("@")[0]!,
        ...(typeof picture === "string" && picture !== "" && { picture }),
      };
    },
  };
}

export type GoogleClient = ReturnType<typeof createGoogleClient>;
