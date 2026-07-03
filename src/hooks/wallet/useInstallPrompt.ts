"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(detectIOS());
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true
    );

    const stored = localStorage.getItem("wallet-install-dismissed");
    if (stored) setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") {
      setDismissed(true);
      localStorage.setItem("wallet-install-dismissed", "1");
    }
    return outcome === "accepted";
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem("wallet-install-dismissed", "1");
  };

  /** Mostrar banner: no instalada y no cerrada por el usuario */
  const showInstallBanner = !isStandalone && !dismissed;

  /** Botón nativo de instalación (Chrome/Android) */
  const canNativeInstall = !!deferred;

  return {
    showInstallBanner,
    canNativeInstall,
    isStandalone,
    isIOS,
    install,
    dismiss,
  };
}
