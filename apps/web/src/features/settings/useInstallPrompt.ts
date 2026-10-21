"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type InstallPlatform = "installed" | "prompt" | "ios" | "unsupported";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Env = "installed" | "ios" | "unsupported";

function detectEnv(): Env {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ua = navigator.userAgent;
  // iPadOS 13+ se apresenta como Macintosh, mas tem tela de toque.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "unsupported";
}

const subscribeEnv = (notify: () => void) => {
  const mql = window.matchMedia?.("(display-mode: standalone)");
  mql?.addEventListener("change", notify);
  return () => mql?.removeEventListener("change", notify);
};

/** Estado da instalação do PWA: já instalado, pronto para `prompt()`, instruções do iOS ou sem suporte. */
export function useInstallPrompt(): { platform: InstallPlatform; install: () => Promise<void> } {
  const env = useSyncExternalStore<Env>(subscribeEnv, detectEnv, () => "unsupported");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // o evento só pode ser usado uma vez
  }, [deferred]);

  const platform: InstallPlatform = installed || env === "installed" ? "installed" : deferred ? "prompt" : env;
  return { platform, install };
}
