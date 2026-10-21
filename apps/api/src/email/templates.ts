const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function resetPasswordEmail(link: string): { subject: string; html: string; text: string } {
  const href = escapeHtml(link);
  return {
    subject: "Redefinir sua senha — Cash Tracker",
    html: `<p>Recebemos um pedido para redefinir a senha da sua conta no Cash Tracker.</p>
<p><a href="${href}">Redefinir senha</a></p>
<p>O link expira em 30 minutos. Se você não pediu isso, ignore este e-mail.</p>`,
    text: `Recebemos um pedido para redefinir a senha da sua conta no Cash Tracker.\n\nAbra o link para escolher uma nova senha:\n${link}\n\nO link expira em 30 minutos. Se você não pediu isso, ignore este e-mail.`,
  };
}
