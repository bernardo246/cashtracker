export type EmailMessage = { to: string; subject: string; html: string; text: string };

export interface EmailSender {
  send(msg: EmailMessage): Promise<void>;
}
