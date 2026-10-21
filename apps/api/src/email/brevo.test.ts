import { describe, expect, it, vi } from "vitest";
import { createBrevoSender } from "./brevo.js";

const env = { BREVO_API_KEY: "chave-secreta", EMAIL_FROM: "no-reply@x.com", EMAIL_FROM_NAME: "Cash Tracker" };
const msg = { to: "ana@x.com", subject: "Assunto", html: "<p>oi</p>", text: "oi" };

describe("brevo sender", () => {
  it("envia o payload correto", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(new Response("{}", { status: 201 })));
    await createBrevoSender(env, fetchFn).send(msg);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "api-key": "chave-secreta", "content-type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({
      sender: { email: "no-reply@x.com", name: "Cash Tracker" },
      to: [{ email: "ana@x.com" }],
      subject: "Assunto",
      htmlContent: "<p>oi</p>",
      textContent: "oi",
    });
  });

  it("lança erro com o status em 4xx, sem vazar a chave", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(new Response("bad", { status: 401 })));
    const err = await createBrevoSender(env, fetchFn as unknown as typeof fetch).send(msg).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("401");
    expect((err as Error).message).not.toContain("chave-secreta");
  });
});
