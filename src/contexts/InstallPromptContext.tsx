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

/** Instalación completada (Chromium): persistente */
const INSTALLED_KEY = "wallet-pwa-installed";
/** Banner cerrado por el usuario: solo esta sesión */
const DISMISS_KEY = "wallet-install-dismissed";
/** Auto-prompt ya lanzado: solo esta sesión */
const AUTO_KEY = "wallet-auto-install-tried";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isClassicIOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se identifica como Mac pero tiene pantalla táctil
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

const InstallPromptContext = createContext<InstallPromptContextValue | null>(
  null
);

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const pwaRef = useRef<PWAInstallElement>(null);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [componentReady, setComponentReady] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsStandalone(isStandaloneMode());
    setInstalled(!!localStorage.getItem(INSTALLED_KEY));
    setDismissed(!!sessionStorage.getItem(DISMISS_KEY));
  }, []);

  // beforeinstallprompt: hay instalación nativa (Chromium). El web component
  // también lo escucha y lo intercepta; aquí solo registramos disponibilidad.
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

  /** Forzado: muestra el diálogo en cualquier plataforma (con instrucciones
   *  paso a paso si no hay instalación nativa). */
  const install = useCallback(() => {
    pwaRef.current?.showDialog(true);
  }, []);

  // Auto-prompt: una vez por sesión.
  // - iOS: forzado en cuanto el componente está listo (no existe prompt nativo)
  // - Android/desktop: cuando beforeinstallprompt confirma instalación nativa
  useEffect(() => {
    if (!componentReady || isStandalone || installed || dismissed) return;
    if (sessionStorage.getItem(AUTO_KEY)) return;

    const forced = platform === "ios";
    if (!forced && !nativeAvailable) return;

    sessionStorage.setItem(AUTO_KEY, "1");
    const timer = window.setTimeout(() => {
      pwaRef.current?.showDialog(forced);
    }, 600);
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
