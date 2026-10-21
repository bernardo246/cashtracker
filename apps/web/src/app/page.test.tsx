import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nav, resetMocks, sessionMock } from "@/features/auth/test-utils";
import Home from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: nav.replace }) }));
vi.mock("@/lib/session", async () => {
  const { sessionValue } = await import("@/features/auth/test-utils");
  return { useSession: () => sessionValue() };
});

beforeEach(resetMocks);

describe("raiz /", () => {
  it("autenticado vai para /visao-geral", () => {
    sessionMock.status = "authenticated";
    render(<Home />);
    expect(nav.replace).toHaveBeenCalledWith("/visao-geral");
  });
  it("anônimo vai para /login", () => {
    sessionMock.status = "anonymous";
    render(<Home />);
    expect(nav.replace).toHaveBeenCalledWith("/login");
  });
  it("carregando não redireciona e mostra skeleton", () => {
    sessionMock.status = "loading";
    render(<Home />);
    expect(nav.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("status", { name: "Carregando" })).toBeInTheDocument();
  });
});
