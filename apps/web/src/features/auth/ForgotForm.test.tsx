import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api-client";
import { ForgotForm } from "./ForgotForm";
import { resetMocks, sessionMock, sessionValue } from "./test-utils";

vi.mock("@/lib/session", () => ({ useSession: () => sessionValue() }));

beforeEach(resetMocks);

const NEUTRAL = "Se o e-mail existir, enviamos um link. Confira também a caixa de spam.";

describe("ForgotForm", () => {
  it("sempre mostra a mensagem neutra após enviar", async () => {
    sessionMock.request.mockResolvedValue(undefined);
    render(<ForgotForm />);
    await userEvent.type(screen.getByLabelText("E-mail"), "ninguem@a.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByRole("status")).toHaveTextContent(NEUTRAL);
    expect(sessionMock.request).toHaveBeenCalledWith("/auth/forgot-password", {
      method: "POST",
      json: { email: "ninguem@a.com" },
    });
  });

  it("mostra erro 429 em alerta, sem a mensagem neutra", async () => {
    sessionMock.request.mockRejectedValue(new ApiError(429, "RATE_LIMITED", "Muitas tentativas. Tente novamente em instantes."));
    render(<ForgotForm />);
    await userEvent.type(screen.getByLabelText("E-mail"), "a@a.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas");
    expect(screen.queryByText(NEUTRAL)).not.toBeInTheDocument();
  });

  it("tem link de volta ao login", () => {
    render(<ForgotForm />);
    expect(screen.getByRole("link", { name: "Voltar para o login" })).toHaveAttribute("href", "/login");
  });
});
