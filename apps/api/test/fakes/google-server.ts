import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import type { GoogleEndpoints } from "../../src/modules/auth/google-client.js";

export type IdClaims = {
  iss: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean | string;
  name: string;
  picture: string;
  nonce: string;
  iat: number;
  exp: number;
};

type Expected = { clientId: string; clientSecret: string; redirectUri: string };
type Grant = { claims: Partial<IdClaims>; challenge: string };

const KID = "fake-google-key";
const ISSUER = "https://accounts.google.com";

// valores de validEnvSource() (test/helpers/app.ts)
const DEFAULTS: Expected = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "http://localhost:3000/api/auth/google/callback",
};

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Google falso: JWKS com uma chave RS256 gerada aqui e um /token que valida o PKCE
 * (code_verifier contra o challenge registrado para o code) e devolve um id_token assinado.
 */
export async function startFakeGoogle(expected: Expected = DEFAULTS): Promise<{
  endpoints: GoogleEndpoints;
  /** Registra um code de uso único. `claims` com valor `undefined` removem o claim do token. */
  issueCode(claims: Partial<IdClaims>, opts: { challenge: string }): string;
  /** Quantas vezes o /token foi chamado. */
  tokenCalls(): number;
  close(): Promise<void>;
}> {
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid: KID, alg: "RS256", use: "sig" };
  const grants = new Map<string, Grant>();
  let calls = 0;

  const sign = (claims: Partial<IdClaims>): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    const payload: Partial<IdClaims> = {
      iss: ISSUER,
      aud: expected.clientId,
      sub: "google-sub-1",
      email: "ana@gmail.com",
      email_verified: true,
      name: "Ana Google",
      iat: now,
      exp: now + 3600,
      ...claims,
    };
    return new SignJWT(payload).setProtectedHeader({ alg: "RS256", kid: KID, typ: "JWT" }).sign(privateKey);
  };

  const server = createServer((req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    void (async () => {
      if (req.method === "GET" && req.url === "/certs") return send(200, { keys: [jwk] });
      if (req.method !== "POST" || req.url !== "/token") return send(404, { error: "not_found" });
      calls += 1;
      if (req.headers["content-type"] !== "application/x-www-form-urlencoded") return send(400, { error: "invalid_request" });
      const form = new URLSearchParams(await readBody(req));
      const code = form.get("code") ?? "";
      const grant = grants.get(code);
      grants.delete(code); // uso único
      const verifier = form.get("code_verifier") ?? "";
      const ok =
        grant !== undefined &&
        form.get("grant_type") === "authorization_code" &&
        form.get("client_id") === expected.clientId &&
        form.get("client_secret") === expected.clientSecret &&
        form.get("redirect_uri") === expected.redirectUri &&
        createHash("sha256").update(verifier).digest("base64url") === grant.challenge;
      if (!ok) return send(400, { error: "invalid_grant" });
      send(200, { id_token: await sign(grant.claims), access_token: "fake-access", token_type: "Bearer", expires_in: 3599 });
    })().catch(() => send(500, { error: "server_error" }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    endpoints: { authUrl: `${base}/auth`, tokenUrl: `${base}/token`, jwksUrl: `${base}/certs`, issuers: [ISSUER, "accounts.google.com"] },
    issueCode(claims, { challenge }) {
      const code = randomBytes(16).toString("base64url");
      grants.set(code, { claims, challenge });
      return code;
    },
    tokenCalls: () => calls,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
