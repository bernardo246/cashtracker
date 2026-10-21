import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InstallAppButton } from "./InstallAppButton";
import { useInstallPrompt } from "./useInstallPrompt";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36";

function setup({ ua = DESKTOP_UA, standalone = false }: { ua?: string; standalone?: boolean } = {}) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  window.matchMedia = ((q: string) => ({
    matches: standalone && q === "(display-mode: standalone)",
    media: q, addEventListener() {}, removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

function installEvent() {
  const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: string }>;
  };
  e.prompt = vi.fn().mockResolvedValue(undefined);
  e.userChoice = Promise.resolve({ outcome: "accepted" });
  return e;
}

beforeEach(() => setup());
afterEach(() => vi.restoreAllMocks());

describe("useInstallPrompt", () => {
  it("unsupported por padrão", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.platform).toBe("unsupported");
  });

  it("ios quando o UA é de iPhone fora do standalone", () => {
    setup({ ua: IPHONE_UA });
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.platform).toBe("ios");
  });

  it("installed quando está em standalone (mesmo no iPhone)", () => {
    setup({ ua: IPHONE_UA, standalone: true });
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.platform).toBe("installed");
  });

  it("prompt após beforeinstallprompt; install() chama prompt()", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const e = installEvent();
    act(() => void window.dispatchEvent(e));
    expect(e.defaultPrevented).toBe(true);
    expect(result.current.platform).toBe("prompt");
    await act(() => result.current.install());
    expect(e.prompt).toHaveBeenCalledTimes(1);
  });

  it("vira installed após o evento appinstalled", () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => void window.dispatchEvent(installEvent()));
    act(() => void window.dispatchEvent(new Event("appinstalled")));
    expect(result.current.platform).toBe("installed");
  });
});

describe("InstallAppButton", () => {
  it("em standalone não renderiza nada", () => {
    setup({ standalone: true });
    const { container } = render(<InstallAppButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sem suporte não renderiza nada", () => {
    const { container } = render(<InstallAppButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("com o evento mostra Instalar app e dispara o prompt", async () => {
    render(<InstallAppButton />);
    const e = installEvent();
    act(() => void window.dispatchEvent(e));
    await userEvent.click(await screen.findByRole("button", { name: "Instalar app" }));
    expect(e.prompt).toHaveBeenCalled();
  });

  it("no iOS mostra as instruções", () => {
    setup({ ua: IPHONE_UA });
    render(<InstallAppButton />);
    expect(screen.getByText(/Toque em Compartilhar e depois em/)).toHaveTextContent(
      "Toque em Compartilhar e depois em 'Adicionar à Tela de Início'",
    );
  });
});
