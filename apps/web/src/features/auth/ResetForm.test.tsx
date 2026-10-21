import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { ResetForm } from "./ResetForm";
import { nav, resetMocks, sessionMock, sessionValue } from "./test-utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (p: string) => void nav.replace(p), push: (p: string) => void nav.push(p) }),
  useSearchParams: () => nav.params,
}));
vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));

const TOKEN = "t".repeat(32);
beforeEach(() => {
  resetMocks();
  nav.params = new URLSearchParams(`token=${TOKEN}`);
});

describe("ResetForm", () => {
  it("não chama a API quando a confirmação difere", async () => {
    render(<ResetForm />);
    await userEvent.type(screen.getByLabelText("Nova senha"), "12345678");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "87654321");
    await userEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));
    expect(await screen.findByText("As senhas não coincidem")).toBeInTheDocument();
    expect(sessionMock.request).not.toHaveBeenCalled();
  });

  it("redefine e volta ao login com ?redefinida=1", async () => {
    sessionMock.request.mockResolvedValue(undefined);
    render(<ResetForm />);
    await userEvent.type(screen.getByLabelText("Nova senha"), "12345678");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "12345678");
    await userEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));
    await waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/login?redefinida=1"));
    expect(sessionMock.request).toHaveBeenCalledWith("/auth/reset-password", {
      method: "POST",
      json: { token: TOKEN, password: "12345678" },
    });
  });

  it("mostra link inválido com 'Pedir um novo' no 400", async () => {
    sessionMock.request.mockRejectedValue(new ApiError(400, "INVALID_RESET_TOKEN", "Link inválido ou expirado"));
    render(<ResetForm />);
    await userEvent.type(screen.getByLabelText("Nova senha"), "12345678");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "12345678");
    await userEvent.click(screen.getByRole("button", { name: "Redefinir senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Link inválido ou expirado");
    expect(screen.getByRole("link", { name: "Pedir um novo" })).toHaveAttribute("href", "/esqueci-senha");
  });

  it("sem token na URL mostra link inválido", () => {
    nav.params = new URLSearchParams();
    render(<ResetForm />);
    expect(screen.getByRole("alert")).toHaveTextContent("Link inválido ou expirado");
    expect(screen.getByRole("link", { name: "Pedir um novo" })).toBeInTheDocument();
  });
});
