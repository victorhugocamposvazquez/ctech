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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

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
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [autoPromptFailed, setAutoPromptFailed] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const autoTriedRef = useRef(false);

  useEffect(() => {
    setIsIOS(detectIOS());
    setIsStandalone(isStandaloneMode());
    if (localStorage.getItem(DISMISS_KEY)) setDismissed(true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const runInstall = useCallback(async (event: BeforeInstallPromptEvent) => {
    setIsPrompting(true);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      setDeferred(null);
      if (outcome === "accepted") {
        setDismissed(true);
        localStorage.setItem(DISMISS_KEY, "1");
        return true;
      }
      return false;
    } catch {
      setAutoPromptFailed(true);
      return false;
    } finally {
      setIsPrompting(false);
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    return runInstall(deferred);
  }, [deferred, runInstall]);

  useEffect(() => {
    if (
      autoTriedRef.current ||
      !deferred ||
      dismissed ||
      isStandalone ||
      isIOS
    ) {
      return;
    }
    if (sessionStorage.getItem(AUTO_TRIED_KEY)) return;

    autoTriedRef.current = true;
    sessionStorage.setItem(AUTO_TRIED_KEY, "1");

    const timer = window.setTimeout(() => {
      void runInstall(deferred).then((ok) => {
        if (!ok) setAutoPromptFailed(true);
      });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [deferred, dismissed, isStandalone, isIOS, runInstall]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  const canNativeInstall = !!deferred;

  const showInstallBanner =
    !isStandalone &&
    !dismissed &&
    !isPrompting &&
    (isIOS || autoPromptFailed || (!canNativeInstall && !isIOS));

  const value = useMemo(
    () => ({
      showInstallBanner,
      canNativeInstall,
      isStandalone,
      isIOS,
      isPrompting,
      install,
      dismiss,
    }),
    [
      showInstallBanner,
      canNativeInstall,
      isStandalone,
      isIOS,
      isPrompting,
      install,
      dismiss,
    ]
  );

  return (
    <InstallPromptContext.Provider value={value}>
      {children}
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
