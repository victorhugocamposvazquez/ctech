import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EVM_NETWORK_META,
  getDefaultEvmNetwork,
  type EvmNetwork,
} from "@/lib/evm/network";
import { isNetworkOperational, isTreasuryConfigured } from "@/lib/evm/contract-registry";

/**
 * GET /api/labs/evm-config — redes EVM disponibles para crear sesiones.
 */
export async function GET() {
  const networksList: EvmNetwork[] = ["bsc", "ethereum", "polygon"];
  let admin = null;

  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const enabled: EvmNetwork[] = [];

  for (const id of networksList) {
    if (!isTreasuryConfigured(id)) continue;
    if (admin) {
      if (await isNetworkOperational(admin, id)) enabled.push(id);
    } else if (networksList.includes(id)) {
      // sin admin client, solo env
      const { isEvmNetworkConfigured } = await import("@/lib/evm/network");
      if (isEvmNetworkConfigured(id)) enabled.push(id);
    }
  }

  const defaultNetwork = enabled.includes(getDefaultEvmNetwork())
    ? getDefaultEvmNetwork()
    : enabled[0] ?? getDefaultEvmNetwork();

  const networks = await Promise.all(
    networksList.map(async (id) => ({
      id,
      label: EVM_NETWORK_META[id].label,
      shortLabel: EVM_NETWORK_META[id].shortLabel,
      nativeCurrency: EVM_NETWORK_META[id].nativeCurrency,
      configured: admin
        ? await isNetworkOperational(admin, id)
        : (await import("@/lib/evm/network")).isEvmNetworkConfigured(id),
    }))
  );

  return NextResponse.json({
    networks,
    enabledNetworks: enabled,
    defaultNetwork,
    multiNetwork: enabled.length > 1,
  });
}
