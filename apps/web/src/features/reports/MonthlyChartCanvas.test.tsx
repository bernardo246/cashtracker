import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MonthlyChartCanvas from "./MonthlyChartCanvas";
import { toChartData } from "./monthly-data";

describe("MonthlyChartCanvas", () => {
  it("renderiza com Recharts no jsdom (largura = meses × 56px) e rolagem horizontal", () => {
    const data = toChartData(
      ["2026-05", "2026-06", "2026-07"].map((month) => ({ month, incomeCents: 100, expenseCents: 50, balanceCents: 50 })),
    );
    const { container } = render(<MonthlyChartCanvas data={data} />);
    expect(container.firstElementChild).toHaveClass("overflow-x-auto");
    expect(container.querySelector(".recharts-wrapper")).toHaveStyle({ width: "168px" });
    expect(container.textContent).toMatch(/mai.*jun.*jul/);
  });
});
