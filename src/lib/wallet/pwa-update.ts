import { registerWalletServiceWorker, SW_SCOPE } from "./pwa-ios";

type UpdateListener = (available: boolean) => void;

const listeners = new Set<UpdateListener>();
let updateAvailable = false;
let registration: ServiceWorkerRegistration | null = null;
let initialized = false;
let skipWaitingPending = false;

const LOCAL_VERSION = process.env.NEXT_PUBLIC_WALLET_BUILD_ID;
const CONTROLLER_CHANGE_TIMEOUT_MS = 4_000;
const INSTALL_WAIT_MS = 8_000;

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
    const res = await fetch(`/wallet/version.json?_=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });
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

async function resolveRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (registration) return registration;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  registration = (await navigator.serviceWorker.getRegistration(SW_SCOPE)) ?? null;
  return registration;
}

function waitForWaitingWorker(
  reg: ServiceWorkerRegistration,
  timeoutMs: number
): Promise<ServiceWorker | null> {
  if (reg.waiting) return Promise.resolve(reg.waiting);

  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const finish = () => {
      reg.removeEventListener("updatefound", onUpdateFound);
      resolve(reg.waiting);
    };

    const onUpdateFound = () => {
      const worker = reg.installing;
      if (!worker) return;

      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && reg.waiting) {
          finish();
        }
      });
    };

    reg.addEventListener("updatefound", onUpdateFound);

    const poll = () => {
      if (reg.waiting) {
        finish();
        return;
      }
      if (Date.now() >= deadline) {
        finish();
        return;
      }
      window.setTimeout(poll, 200);
    };

    poll();
  });
}

function waitForControllerChange(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, timeoutMs);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
}

async function clearAppCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

function hardReload(): void {
  skipWaitingPending = false;
  window.location.reload();
}

/** Detecta nuevas versiones del SW / build y expone banner de actualización. */
export async function initPwaUpdateCheck(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (initialized) return;
  initialized = true;

  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (skipWaitingPending) {
      hardReload();
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
export async function applyPwaUpdate(): Promise<void> {
  skipWaitingPending = true;

  try {
    const reg = await resolveRegistration();
    if (reg) {
      await reg.update();
      const waiting = await waitForWaitingWorker(reg, INSTALL_WAIT_MS);

      if (waiting) {
        waiting.postMessage({ type: "SKIP_WAITING" });
        await waitForControllerChange(CONTROLLER_CHANGE_TIMEOUT_MS);
        if (!skipWaitingPending) return;
      }
    }
  } catch {
    /* red / SW no disponible */
  }

  try {
    await clearAppCaches();
  } catch {
    /* ignore */
  }

  hardReload();
}

/** Comprueba manualmente si hay versión nueva (p. ej. desde Ajustes). */
export async function checkForPwaUpdateNow(): Promise<boolean> {
  await runUpdateChecks();
  return updateAvailable;
}
