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
import { useWalletTheme } from "@/contexts/WalletThemeContext";
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
  const isIn = item.type === "transfer_in";
  const isOut = item.type === "transfer_out";

  return (
    <button
      type="button"
      onClick={() => unread && void onRead(item.id)}
      className={`wallet-notif-row ${unread ? "wallet-notif-row--unread" : ""}`}
    >
      <div
        className={`wallet-notif-row-icon ${
          isIn ? "wallet-notif-row-icon--in" : isOut ? "wallet-notif-row-icon--out" : ""
        }`}
        aria-hidden
      >
        {isIn ? "↓" : isOut ? "↑" : "•"}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="wallet-notif-row-title">{item.title}</p>
        <p
          className={`wallet-notif-row-body ${
            isIn ? "wallet-notif-row-body--in" : isOut ? "wallet-notif-row-body--out" : ""
          }`}
        >
          {item.body}
        </p>
        <p className="wallet-notif-row-time">{formatWhen(item.created_at)}</p>
      </div>
      {unread && <span className="wallet-notif-row-dot" aria-hidden />}
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
    <div className="wallet-overlay wallet-overlay--modal wallet-notif-modal-wrap" role="dialog" aria-modal="true">
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
        <p className="wallet-transfer-modal-amount">{item.body}</p>
        <div className="wallet-transfer-modal-actions">
          <button type="button" className="wallet-btn-primary" onClick={onClose}>
            {t.close}
          </button>
          <button type="button" className="wallet-notif-link-btn" onClick={onViewAll}>
            {t.viewAllNotifications}
          </button>
        </div>
      </div>
    </div>
  );
}

export function WalletNotificationProvider({ children }: { children: ReactNode }) {
  const { address } = useWalletSession();
  const { themeClass } = useWalletTheme();
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
      <div className={`wallet-theme ${themeClass}`}>
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
          <div className="wallet-overlay wallet-notif-sheet-wrap" role="dialog" aria-modal="true">
            <button
              type="button"
              className="wallet-overlay-backdrop"
              aria-label={t.close}
              onClick={() => setSheetOpen(false)}
            />
            <div className="wallet-sheet wallet-notif-sheet">
              <div className="wallet-sheet-handle" />
              <div className="wallet-notif-sheet-header">
                <h2 className="wallet-notif-sheet-title">{t.notifications}</h2>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void markAllRead()}
                      className="wallet-notif-mark-read"
                    >
                      {t.markAllRead}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="wallet-icon-btn !h-9 !w-9"
                    aria-label={t.close}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="wallet-notif-sheet-list">
                {notifications.length === 0 ? (
                  <div className="wallet-notif-empty">{t.noNotifications}</div>
                ) : (
                  notifications.map((item) => (
                    <NotificationRow key={item.id} item={item} onRead={markRead} />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
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
