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
import { IosInstallGuide } from "@/components/wallet/IosInstallGuide";

const INSTALLED_KEY = "wallet-pwa-installed";
const DISMISS_KEY = "wallet-install-dismissed";
const AUTO_KEY = "wallet-auto-install-tried";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua);
  const isModernIPad = /Mac/.test(ua) && navigator.maxTouchPoints > 2;
  if (isClassicIOS || isModernIPad) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
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
  install: () => void;
  dismiss: () => void;
}

const InstallPromptContext = createContext<InstallPromptContextValue | null>(null);

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const pwaRef = useRef<PWAInstallElement>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [componentReady, setComponentReady] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsStandalone(isStandaloneMode());
    setInstalled(!!localStorage.getItem(INSTALLED_KEY));
    setDismissed(!!sessionStorage.getItem(DISMISS_KEY));
  }, []);

  useEffect(() => {
    const onBeforeInstall = () => setNativeAvailable(true);
    const onInstalled = () => {
      setInstalled(true);
      localStorage.setItem(INSTALLED_KEY, "1");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const markInstalled = useCallback(() => {
    setInstalled(true);
    localStorage.setItem(INSTALLED_KEY, "1");
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }, []);

  const install = useCallback(() => {
    // iOS: Apple no expone API de instalación — guía in-app propia (siempre funciona)
    if (detectPlatform() === "ios") {
      setIosGuideOpen(true);
      return;
    }
    // Android / desktop Chromium: diálogo nativo vía web component
    if (pwaRef.current?.showDialog) {
      pwaRef.current.showDialog(true);
    }
  }, []);

  useEffect(() => {
    if (!componentReady || isStandalone || installed || dismissed) return;
    if (sessionStorage.getItem(AUTO_KEY)) return;

    const isIos = platform === "ios";
    if (!isIos && !nativeAvailable) return;

    sessionStorage.setItem(AUTO_KEY, "1");
    const timer = window.setTimeout(() => {
      if (isIos) {
        setIosGuideOpen(true);
      } else {
        pwaRef.current?.showDialog(true);
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [componentReady, nativeAvailable, platform, isStandalone, installed, dismissed]);

  const showInstallBanner = !isStandalone && !installed && !dismissed;

  const value = useMemo(
    () => ({
      showInstallBanner,
      canNativeInstall: nativeAvailable,
      isStandalone: isStandalone || installed,
      isIOS: platform === "ios",
      install,
      dismiss,
    }),
    [showInstallBanner, nativeAvailable, isStandalone, installed, platform, install, dismiss]
  );

  return (
    <InstallPromptContext.Provider value={value}>
      {children}
      <PWAInstall
        ref={pwaRef}
        onReady={() => setComponentReady(true)}
        onInstallAvailable={() => setNativeAvailable(true)}
        onInstallSuccess={markInstalled}
      />
      <IosInstallGuide open={iosGuideOpen} onClose={() => setIosGuideOpen(false)} />
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt() {
  const ctx = useContext(InstallPromptContext);
  if (!ctx) throw new Error("useInstallPrompt outside InstallPromptProvider");
  return ctx;
}
