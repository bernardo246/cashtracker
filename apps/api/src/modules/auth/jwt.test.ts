import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { testEnv } from "../../../test/helpers/app.js";
import { createJwtService } from "./jwt.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";

describe("jwt", () => {
  it("sign/verify ida e volta; token de outra chave é rejeitado", async () => {
    const jwt = createJwtService(testEnv());
    const token = await jwt.sign(USER_ID);
    await expect(jwt.verify(token)).resolves.toEqual({ userId: USER_ID });

    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    const other = createJwtService(testEnv({ JWT_PRIVATE_KEY: Buffer.from(privateKey).toString("base64") }));
    await expect(jwt.verify(await other.sign(USER_ID))).rejects.toMatchObject({
      status: 401,
      code: "INVALID_TOKEN",
      message: "Sessão expirada",
    });
  });

  it("token expirado após 15 min é rejeitado", async () => {
    let now = new Date("2026-01-01T00:00:00Z");
    const jwt = createJwtService(testEnv(), () => now);
    const token = await jwt.sign(USER_ID);
    now = new Date(now.getTime() + 14 * 60_000 + 59_000);
    await expect(jwt.verify(token)).resolves.toEqual({ userId: USER_ID });
    now = new Date(now.getTime() + 2_000); // 15m01s
    await expect(jwt.verify(token)).rejects.toMatchObject({ status: 401, code: "INVALID_TOKEN" });
  });

  it("rejeita lixo e token com iss/aud errados", async () => {
    const jwt = createJwtService(testEnv());
    await expect(jwt.verify("não-é-jwt")).rejects.toMatchObject({ status: 401 });
    const otherIssuer = createJwtService(testEnv({ APP_URL: "http://outro.example" }));
    await expect(jwt.verify(await otherIssuer.sign(USER_ID))).rejects.toMatchObject({ status: 401 });
  });
});
