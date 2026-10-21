import manifest from "./manifest";

describe("manifest", () => {
  it("é um app standalone que abre na visão geral", () => {
    const m = manifest();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/visao-geral");
    expect(m.name).toBe("Cash Tracker");
    expect(m.short_name).toBe("Cash");
    expect(m.lang).toBe("pt-BR");
    expect(m.background_color).toBe("#0B0F0E");
    expect(m.theme_color).toBe("#0B0F0E");
  });

  it("declara ícones 192, 512 e maskable", () => {
    const icons = manifest().icons ?? [];
    expect(icons).toContainEqual(expect.objectContaining({ src: "/icons/icon-192.png", sizes: "192x192" }));
    expect(icons).toContainEqual(expect.objectContaining({ src: "/icons/icon-512.png", sizes: "512x512" }));
    expect(icons).toContainEqual(
      expect.objectContaining({ src: "/icons/maskable-512.png", sizes: "512x512", purpose: "maskable" }),
    );
  });
});
