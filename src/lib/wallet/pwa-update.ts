import { registerWalletServiceWorker } from "./pwa-ios";

type UpdateListener = (available: boolean) => void;

const listeners = new Set<UpdateListener>();
let updateAvailable = false;
let registration: ServiceWorkerRegistration | null = null;
let initialized = false;
let skipWaitingPending = false;

const LOCAL_VERSION = process.env.NEXT_PUBLIC_WALLET_BUILD_ID;

function notify(): void {
  for (const listener of listeners) listener(updateAvailable);
}

export function subscribePwaUpdate(listener: UpdateListener): () => void {
  listeners.add(listener);
  listener(updateAvailable);
  return () => listeners.delete(listener);
}

export function isPwaUpdateAvailable(): boolean {
  return updateAvailable;
}

function markUpdateAvailable(): void {
  if (updateAvailable) return;
  updateAvailable = true;
  notify();
}

async function checkRemoteVersion(): Promise<void> {
  if (!LOCAL_VERSION || LOCAL_VERSION === "dev") return;

  try {
    const res = await fetch(
      `/wallet/version.json?_=${Date.now()}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
    if (!res.ok) return;

    const data = (await res.json()) as { v?: string };
    if (data.v && data.v !== LOCAL_VERSION) {
      markUpdateAvailable();
    }
  } catch {
    /* sin red */
  }
}

function watchRegistration(reg: ServiceWorkerRegistration, hadController: boolean): void {
  if (reg.waiting && hadController) {
    markUpdateAvailable();
  }

  reg.addEventListener("updatefound", () => {
    const worker = reg.installing;
    if (!worker) return;

    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && hadController) {
        markUpdateAvailable();
      }
    });
  });
}

async function runUpdateChecks(): Promise<void> {
  await registration?.update();
  await checkRemoteVersion();
}

/** Detecta nuevas versiones del SW / build y expone banner de actualización. */
export async function initPwaUpdateCheck(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (initialized) return;
  initialized = true;

  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (skipWaitingPending) {
      window.location.reload();
    }
  });

  registration = await registerWalletServiceWorker();
  if (registration) {
    watchRegistration(registration, hadController);
  }

  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    void runUpdateChecks();
  };

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);

  void runUpdateChecks();

  window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void runUpdateChecks();
    }
  }, 2 * 60 * 1000);
}

/** Recarga la app aplicando el service worker / assets más recientes. */
export function applyPwaUpdate(): void {
  skipWaitingPending = true;
  const waiting = registration?.waiting;

  if (waiting) {
    waiting.postMessage({ type: "SKIP_WAITING" });
    return;
  }

  window.location.reload();
}

/** Comprueba manualmente si hay versión nueva (p. ej. desde Ajustes). */
export async function checkForPwaUpdateNow(): Promise<boolean> {
  await runUpdateChecks();
  return updateAvailable;
}
