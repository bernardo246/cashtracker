import type { FastifyInstance } from "fastify";
import type { UserDto } from "@cash/shared";

export const ORIGIN = "http://localhost:3000"; // APP_URL de teste
export const H = { origin: ORIGIN };

let seq = 0;

/** Extrai "rt=<valor>" do Set-Cookie para reenviar em header Cookie. */
export function cookiePair(setCookie: string | string[] | undefined, name = "rt"): string | undefined {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const line = list.find((c) => c.startsWith(`${name}=`));
  return line?.split(";")[0];
}

export async function registerUser(
  app: FastifyInstance,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<{ accessToken: string; cookie: string; user: UserDto }> {
  seq += 1;
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    headers: H,
    payload: { name: "Ana", email: `user${seq}@example.com`, password: "senha-forte-123", ...overrides },
  });
  if (res.statusCode !== 201) throw new Error(`registerUser falhou: ${res.statusCode} ${res.body}`);
  const body = res.json<{ accessToken: string; user: UserDto }>();
  return { accessToken: body.accessToken, cookie: cookiePair(res.headers["set-cookie"])!, user: body.user };
}
