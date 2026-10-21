import type { ByCategoryReport } from "@cash/shared";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBarChart } from "./CategoryBarChart";

const items: ByCategoryReport["items"] = [
  { categoryId: "1", name: "Mercado", icon: "ShoppingCart", color: "#fff", archived: false, totalCents: 62500, share: 0.625 },
  { categoryId: "2", name: "Assinaturas e serviços de streaming", icon: "Bus", color: "#fff", archived: false, totalCents: 25000, share: 0.25 },
  { categoryId: "3", name: "Lazer", icon: "Gamepad2", color: "#fff", archived: true, totalCents: 12500, share: 0.125 },
];

function renderChart() {
  return render(<CategoryBarChart items={items} color="var(--color-danger)" label="Gastos por categoria, outubro de 2026" />);
}

describe("CategoryBarChart", () => {
  it("é uma lista nomeada com um item por categoria, na ordem recebida", () => {
    renderChart();
    const list = screen.getByRole("list", { name: "Gastos por categoria, outubro de 2026" });
    const lis = within(list).getAllByRole("listitem");
    expect(lis).toHaveLength(3);
    expect(lis[0]).toHaveTextContent(/Mercado.*R\$\s*625,00\s*·\s*62,5%/);
    expect(lis[1]).toHaveTextContent("Assinaturas e serviços de streaming");
    expect(lis[2]).toHaveTextContent(/Lazer \(arquivada\).*R\$\s*125,00\s*·\s*12,5%/);
  });

  it("a largura da barra corresponde à parte do total, com a cor única", async () => {
    const { container } = renderChart();
    const bars = container.querySelectorAll<HTMLElement>("[data-bar]");
    await waitFor(() => expect(bars[0]!.style.width).toBe("62.5%"));
    expect(bars[2]!.style.width).toBe("12.5%");
    expect(bars[0]!.style.background).toBe("var(--color-danger)");
    expect(bars[0]!.parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("nome longo trunca e o valor nunca", () => {
    const { container } = renderChart();
    const li = container.querySelectorAll("li")[1]!;
    expect(li.querySelector("[data-name]")).toHaveClass("truncate");
    expect(li.querySelector("[data-value]")).not.toHaveClass("truncate");
    expect(li.querySelector("[data-value]")).toHaveClass("shrink-0");
  });
});
