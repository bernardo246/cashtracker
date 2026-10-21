import type { Env } from "../config/env.js";
import type { EmailSender } from "./email-sender.js";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export function createBrevoSender(
  env: Pick<Env, "BREVO_API_KEY" | "EMAIL_FROM" | "EMAIL_FROM_NAME">,
  fetchFn: typeof fetch = fetch,
): EmailSender {
  return {
    async send({ to, subject, html, text }) {
      const res = await fetchFn(BREVO_URL, {
        method: "POST",
        headers: {
          "api-key": env.BREVO_API_KEY ?? "",
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME },
          to: [{ email: to }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Brevo respondeu ${res.status}`);
    },
  };
}
