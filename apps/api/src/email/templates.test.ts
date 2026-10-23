import { describe, expect, it } from "vitest";
import { resetPasswordEmail } from "./templates.js";

const link = "https://cashtracker.test/redefinir-senha?token=abc_DEF-123";

describe("resetPasswordEmail", () => {
  it("traz um botão clicável apontando para o link", () => {
    const { html } = resetPasswordEmail(link);
    expect(html).toMatch(new RegExp(`<a [^>]*href="${link.replace(/[.?]/g, "\\$&")}"[^>]*>\\s*Redefinir senha\\s*</a>`));
  });

  it("mostra a URL completa por extenso para copiar quando o cliente desativa links", () => {
    const { html } = resetPasswordEmail(link);
    const withoutAnchors = html.replace(/<a [^>]*>[\s\S]*?<\/a>/g, "");
    expect(withoutAnchors).toContain(link);
  });

  it("escapa o link no HTML", () => {
    const { html } = resetPasswordEmail('https://x.test/r?token=a"b<c');
    expect(html).not.toContain('a"b<c');
    expect(html).toContain("a&quot;b&lt;c");
  });

  it("mantém a versão em texto com o link e a validade", () => {
    const { subject, text } = resetPasswordEmail(link);
    expect(subject).toBe("Redefinir sua senha — Cash Tracker");
    expect(text).toContain(link);
    expect(text).toContain("O link expira em 30 minutos");
  });
});
