import type { ByCategoryReport } from "@cash/shared";
import { render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryBarChart } from "./CategoryBarChart";

// jsdom não tem layout: o ResponsiveContainer real renderiza 0x0.
vi.mock("recharts", async (orig) => ({
  ...(await orig<typeof import("recharts")>()),
  ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) =>
    cloneElement(children, { width: 700, height: 132 }),
}));

const items: ByCategoryReport["items"] = [
  { categoryId: "1", name: "Mercado", icon: "ShoppingCart", color: "#fff", archived: false, totalCents: 62500, share: 0.625 },
  { categoryId: "2", name: "Transporte", icon: "Bus", color: "#fff", archived: false, totalCents: 25000, share: 0.25 },
  { categoryId: "3", name: "Lazer", icon: "Gamepad2", color: "#fff", archived: true, totalCents: 12500, share: 0.125 },
];

function stubMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reduced, media: q, addEventListener() {}, removeEventListener() {},
  }));
}

describe("CategoryBarChart", () => {
  // sem animação o Recharts desenha barras e rótulos de imediato (jsdom não anima)
  beforeEach(() => stubMotion(true));

  it("mostra os rótulos das categorias na ordem recebida, com valor e percentual", () => {
    const { container } = render(<CategoryBarChart items={items} color="var(--color-danger)" />);
    const text = container.textContent ?? "";
    expect(text.indexOf("Mercado")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Mercado")).toBeLessThan(text.indexOf("Transporte"));
    expect(text.indexOf("Transporte")).toBeLessThan(text.indexOf("Lazer (arquivada)"));
    expect(screen.getByText(/R\$\s*625,00\s*·\s*62,5%/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*125,00\s*·\s*12,5%/)).toBeInTheDocument();
  });

  it("usa altura de 44px por categoria", () => {
    const { container } = render(<CategoryBarChart items={items} color="var(--color-danger)" />);
    expect((container.firstChild as HTMLElement).style.height).toBe("132px");
  });
});
