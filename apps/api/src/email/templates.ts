const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function resetPasswordEmail(link: string): { subject: string; html: string; text: string } {
  const href = escapeHtml(link);
  // Botão com estilos inline (clientes de e-mail ignoram <style>) e a URL por extenso:
  // quando o e-mail cai no spam, o Gmail desativa os links e só o texto copiável resta.
  return {
    subject: "Redefinir sua senha — Cash Tracker",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111714">
<p>Recebemos um pedido para redefinir a senha da sua conta no Cash Tracker.</p>
<p style="margin:24px 0"><a href="${href}" style="display:inline-block;padding:12px 24px;background:#3ECF8E;color:#07120D;text-decoration:none;font-weight:bold;border-radius:8px">Redefinir senha</a></p>
<p>Se o botão não funcionar, copie e cole este endereço no navegador:</p>
<p style="word-break:break-all;font-family:monospace;font-size:14px">${href}</p>
<p>O link expira em 30 minutos. Se você não pediu isso, ignore este e-mail.</p>
</div>`,
    text: `Recebemos um pedido para redefinir a senha da sua conta no Cash Tracker.\n\nAbra o link para escolher uma nova senha:\n${link}\n\nO link expira em 30 minutos. Se você não pediu isso, ignore este e-mail.`,
  };
}
