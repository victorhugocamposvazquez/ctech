"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWalletNotifications,
  notifyWalletTransferReceived,
  type WalletNotification,
} from "@/hooks/wallet/useWalletNotifications";
import { useWalletSession } from "@/hooks/wallet/useWalletSession";
import { t } from "@/lib/wallet/i18n";

type WalletNotificationUi = {
  unreadCount: number;
  openSheet: () => void;
};

const WalletNotificationContext = createContext<WalletNotificationUi | null>(null);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function NotificationRow({
  item,
  onRead,
}: {
  item: WalletNotification;
  onRead: (id: string) => void;
}) {
  const unread = !item.read_at;

  return (
    <button
      type="button"
      onClick={() => unread && void onRead(item.id)}
      className={`w-full text-left px-4 py-3 border-b border-wallet-border last:border-0 transition ${
        unread ? "bg-wallet-accent-soft/40" : "opacity-80"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-wallet-text text-[15px]">{item.title}</p>
        {unread && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-wallet-accent" />
        )}
      </div>
      <p className="mt-1 text-sm text-wallet-muted">{item.body}</p>
      <p className="mt-2 text-xs text-wallet-muted">{formatWhen(item.created_at)}</p>
    </button>
  );
}

function TransferReceivedModal({
  item,
  onClose,
  onViewAll,
}: {
  item: WalletNotification;
  onClose: () => void;
  onViewAll: () => void;
}) {
  return (
    <div className="wallet-overlay wallet-overlay--modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="wallet-overlay-backdrop"
        aria-label={t.close}
        onClick={onClose}
      />
      <div className="wallet-transfer-modal">
        <div className="wallet-transfer-modal-icon" aria-hidden>
          ↓
        </div>
        <h2 className="wallet-transfer-modal-title">{item.title}</h2>
        <p className="wallet-transfer-modal-body">{item.body}</p>
        <div className="wallet-transfer-modal-actions">
          <button type="button" className="wallet-btn-primary" onClick={onClose}>
            {t.close}
          </button>
          <button type="button" className="wallet-btn-secondary" onClick={onViewAll}>
            {t.notifications}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WalletNotificationProvider({ children }: { children: ReactNode }) {
  const { address } = useWalletSession();
  const queryClient = useQueryClient();
  const { notifications, unreadCount, markRead, markAllRead, refresh } =
    useWalletNotifications(address);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [incomingModal, setIncomingModal] = useState<WalletNotification | null>(null);
  const [mounted, setMounted] = useState(false);
  const prevUnreadRef = useRef<number | null>(null);
  const seenTransferIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("wallet-transfer-received", handler);
    return () => window.removeEventListener("wallet-transfer-received", handler);
  }, [refresh]);

  const showIncoming = useCallback(
    (item: WalletNotification) => {
      if (item.type !== "transfer_in") return;
      if (seenTransferIdsRef.current.has(item.id)) return;
      seenTransferIdsRef.current.add(item.id);
      setIncomingModal(item);
      notifyWalletTransferReceived();
      if (address) {
        void queryClient.invalidateQueries({
          queryKey: ["wallet-simulated-credits", address.toLowerCase()],
        });
      }
    },
    [address, queryClient]
  );

  useEffect(() => {
    if (!address) return;

    const unread = notifications.filter((n) => !n.read_at);
    const prev = prevUnreadRef.current;

    if (prev === null) {
      prevUnreadRef.current = unread.length;
      const recent = unread.find(
        (n) =>
          n.type === "transfer_in" &&
          Date.now() - new Date(n.created_at).getTime() < 5 * 60_000
      );
      if (recent) showIncoming(recent);
      return;
    }

    if (unread.length > prev) {
      const newest = notifications.find((n) => !n.read_at && n.type === "transfer_in");
      if (newest) showIncoming(newest);
    }

    prevUnreadRef.current = unread.length;
  }, [notifications, address, showIncoming]);

  const openSheet = useCallback(() => setSheetOpen(true), []);

  const portal =
    mounted && address ? (
      <>
        {incomingModal && (
          <TransferReceivedModal
            item={incomingModal}
            onClose={() => setIncomingModal(null)}
            onViewAll={() => {
              setIncomingModal(null);
              setSheetOpen(true);
            }}
          />
        )}

        {sheetOpen && (
          <div className="wallet-overlay" role="dialog" aria-modal="true">
            <button
              type="button"
              className="wallet-overlay-backdrop"
              aria-label={t.close}
              onClick={() => setSheetOpen(false)}
            />
            <div className="wallet-sheet wallet-sheet--nav-safe max-h-[min(72dvh,560px)] overflow-hidden">
              <div className="wallet-sheet-handle" />
              <div className="flex items-center justify-between border-b border-wallet-border px-4 pb-3">
                <h2 className="text-[17px] font-semibold text-wallet-text">{t.notifications}</h2>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="text-xs font-medium text-wallet-accent"
                    >
                      {t.markAllRead}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="wallet-icon-btn !h-8 !w-8"
                    aria-label={t.close}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto max-h-[calc(min(72dvh,560px)-96px)]">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-wallet-muted">
                    {t.noNotifications}
                  </div>
                ) : (
                  notifications.map((item) => (
                    <NotificationRow key={item.id} item={item} onRead={markRead} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </>
    ) : null;

  return (
    <WalletNotificationContext.Provider value={{ unreadCount, openSheet }}>
      {children}
      {portal && createPortal(portal, document.body)}
    </WalletNotificationContext.Provider>
  );
}

export function useWalletNotificationUi(): WalletNotificationUi {
  const ctx = useContext(WalletNotificationContext);
  if (!ctx) {
    return { unreadCount: 0, openSheet: () => {} };
  }
  return ctx;
}
