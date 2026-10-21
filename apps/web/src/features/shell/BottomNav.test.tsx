import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "./BottomNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/gastos" }));

describe("BottomNav", () => {
  it("marca o item ativo com aria-current=page", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gastos" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Entradas" })).not.toHaveAttribute("aria-current");
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });
});
