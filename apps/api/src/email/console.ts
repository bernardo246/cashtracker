import type { EmailSender } from "./email-sender.js";

type Logger = { info: (obj: object, msg: string) => void };

/** Dev: loga o e-mail (inclui o link) em vez de enviar. Nunca usar em produção. */
export function createConsoleSender(log: Logger): EmailSender {
  return {
    send(msg) {
      log.info({ to: msg.to, subject: msg.subject, text: msg.text }, "e-mail (console)");
      return Promise.resolve();
    },
  };
}
