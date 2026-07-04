"use client";

import { useQuery } from "@tanstack/react-query";
import type { WalletTokenConfig } from "@/lib/wallet/managed-tokens";

async function fetchManagedTokens(): Promise<WalletTokenConfig[]> {
  const res = await fetch("/api/wallet/tokens");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Error al cargar tokens");
  return json.tokens ?? [];
}

export function useManagedTokens() {
  return useQuery({
    queryKey: ["wallet-managed-tokens"],
    queryFn: fetchManagedTokens,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
