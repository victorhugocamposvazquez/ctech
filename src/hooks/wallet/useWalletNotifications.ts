"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAddress } from "viem";

export interface WalletNotification {
  id: string;
  wallet_address: string;
  type: "transfer_in" | "transfer_out" | "system";
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

async function fetchNotifications(address: string) {
  const res = await fetch(
    `/api/wallet/notifications?address=${encodeURIComponent(address)}&limit=30`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Error al cargar notificaciones");
  return {
    notifications: (json.notifications ?? []) as WalletNotification[],
    unreadCount: Number(json.unreadCount ?? 0),
  };
}

async function registerWallet(address: string) {
  await fetch("/api/wallet/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
}

export function useWalletNotifications(address?: string | null) {
  const queryClient = useQueryClient();
  const normalized = address?.toLowerCase() ?? "";

  useEffect(() => {
    if (!address || !isAddress(address)) return;
    void registerWallet(address);
  }, [address]);

  const query = useQuery({
    queryKey: ["wallet-notifications", normalized],
    queryFn: () => fetchNotifications(normalized),
    enabled: !!normalized && isAddress(normalized),
    refetchInterval: 30_000,
  });

  const markRead = useCallback(
    async (id: string) => {
      if (!address) return;
      await fetch(`/api/wallet/notifications/${id}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      await queryClient.invalidateQueries({
        queryKey: ["wallet-notifications", normalized],
      });
    },
    [address, normalized, queryClient]
  );

  const markAllRead = useCallback(async () => {
    const unread = (query.data?.notifications ?? []).filter((n) => !n.read_at);
    await Promise.all(unread.map((n) => markRead(n.id)));
  }, [markRead, query.data?.notifications]);

  return useMemo(
    () => ({
      notifications: query.data?.notifications ?? [],
      unreadCount: query.data?.unreadCount ?? 0,
      isLoading: query.isLoading,
      markRead,
      markAllRead,
      refresh: () =>
        queryClient.invalidateQueries({
          queryKey: ["wallet-notifications", normalized],
        }),
    }),
    [
      query.data?.notifications,
      query.data?.unreadCount,
      query.isLoading,
      markRead,
      markAllRead,
      queryClient,
      normalized,
    ]
  );
}

export function notifyWalletTransferReceived(): void {
  window.dispatchEvent(new Event("wallet-transfer-received"));
}
