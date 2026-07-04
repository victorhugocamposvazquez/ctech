"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useWalletNotifications,
  notifyWalletTransferReceived,
  type WalletNotification,
} from "@/hooks/wallet/useWalletNotifications";
import { t } from "@/lib/wallet/i18n";

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

function TransferToast({
  item,
  onDismiss,
  onOpen,
}: {
  item: WalletNotification;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="wallet-transfer-toast" role="status">
      <button type="button" className="wallet-transfer-toast-body" onClick={onOpen}>
        <span className="wallet-transfer-toast-icon" aria-hidden>
          ↓
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block font-semibold text-wallet-text text-[15px]">
            {item.title}
          </span>
          <span className="mt-0.5 block text-sm text-wallet-muted">{item.body}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="wallet-transfer-toast-close"
        aria-label={t.close}
      >
        ✕
      </button>
    </div>
  );
}

export function WalletNotificationsBell({ address }: { address?: string }) {
  const queryClient = useQueryClient();
  const { notifications, unreadCount, markRead, markAllRead, refresh } =
    useWalletNotifications(address);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<WalletNotification | null>(null);
  const [mounted, setMounted] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("wallet-transfer-received", handler);
    return () => window.removeEventListener("wallet-transfer-received", handler);
  }, [refresh]);

  useEffect(() => {
    if (!address || notifications.length === 0) return;

    const unread = notifications.filter((n) => !n.read_at);
    const fresh = unread.filter((n) => !seenIdsRef.current.has(n.id));

    if (readyRef.current && fresh.length > 0) {
      const latest = fresh[0];
      setToast(latest);
      notifyWalletTransferReceived();
      void queryClient.invalidateQueries({
        queryKey: ["wallet-simulated-credits", address.toLowerCase()],
      });
    }

    seenIdsRef.current = new Set(notifications.map((n) => n.id));
    readyRef.current = true;
  }, [notifications, address, queryClient]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!address) return null;

  const sheet = open && mounted ? (
    <div className="wallet-overlay wallet-overlay--above-nav" role="dialog" aria-modal="true">
      <button
        type="button"
        className="wallet-overlay-backdrop"
        aria-label={t.close}
        onClick={() => setOpen(false)}
      />
      <div className="wallet-sheet wallet-sheet--nav-safe max-h-[min(70dvh,520px)] overflow-hidden">
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
              onClick={() => setOpen(false)}
              className="wallet-icon-btn !h-8 !w-8"
              aria-label={t.close}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[calc(min(70dvh,520px)-88px)]">
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
  ) : null;

  const toastPortal =
    toast && mounted ? (
      <TransferToast
        item={toast}
        onDismiss={() => setToast(null)}
        onOpen={() => {
          setToast(null);
          setOpen(true);
        }}
      />
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="wallet-icon-btn relative"
        aria-label={t.notifications}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-wallet-accent px-1 text-[10px] font-bold text-[#041018]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {mounted && sheet ? createPortal(sheet, document.body) : null}
      {mounted && toastPortal ? createPortal(toastPortal, document.body) : null}
    </>
  );
}
