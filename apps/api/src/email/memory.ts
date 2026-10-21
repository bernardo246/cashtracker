import type { EmailMessage, EmailSender } from "./email-sender.js";

export type MemorySender = EmailSender & { last(to: string): EmailMessage | undefined };

/** E2E: guarda o último e-mail por destinatário (minúsculas). Só com NODE_ENV=test. */
export function createMemorySender(): MemorySender {
  const byRecipient = new Map<string, EmailMessage>();
  return {
    send(msg) {
      byRecipient.set(msg.to.toLowerCase(), msg);
      return Promise.resolve();
    },
    last: (to) => byRecipient.get(to.toLowerCase()),
  };
}
