"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PWAInstallElement } from "@khmyznikov/pwa-install";
import { PWAInstall } from "@/components/wallet/PWAInstall";

const DISMISS_KEY = "wallet-install-dismissed";
const AUTO_TRIED_KEY = "wallet-auto-install-tried";

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

interface InstallPromptContextValue {
  showInstallBanner: boolean;
  canNativeInstall: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isPrompting: boolean;
  install: () => Promise<boolean>;
  dismiss: () => void;
}

const InstallPromptContext = createContext<InstallPromptContextValue | null>(
  null
);

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const pwaRef = useRef<PWAInstallElement>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const autoTriedRef = useRef(false);

  useEffect(() => {
    setIsIOS(detectIOS());
    setIsStandalone(isStandaloneMode());
    if (localStorage.getItem(DISMISS_KEY)) setDismissed(true);
  }, []);

  const markInstalled = useCallback(() => {
    setDismissed(true);
    setIsStandalone(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  const install = useCallback(async () => {
    pwaRef.current?.showDialog(true);
    return true;
  }, []);

  useEffect(() => {
    if (autoTriedRef.current || dismissed || isStandalone) return;
    if (sessionStorage.getItem(AUTO_TRIED_KEY)) return;

    autoTriedRef.current = true;
    sessionStorage.setItem(AUTO_TRIED_KEY, "1");

    const timer = window.setTimeout(() => {
      // iOS: no hay beforeinstallprompt — forzar diálogo con instrucciones Safari
      pwaRef.current?.showDialog(isIOS);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [dismissed, isStandalone, isIOS]);

  const showInstallBanner = !isStandalone && !dismissed;

  const value = useMemo(
    () => ({
      showInstallBanner,
      canNativeInstall: true,
      isStandalone,
      isIOS,
      isPrompting: false,
      install,
      dismiss,
    }),
    [showInstallBanner, isStandalone, isIOS, install, dismiss]
  );

  return (
    <InstallPromptContext.Provider value={value}>
      {children}
      <PWAInstall ref={pwaRef} onInstallSuccess={markInstalled} />
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt() {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) {
    throw new Error("useInstallPrompt outside InstallPromptProvider");
  }
  return ctx;
}
