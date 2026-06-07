import { NextResponse } from "next/server";
import {
  EVM_NETWORK_META,
  getDefaultEvmNetwork,
  getEnabledEvmNetworks,
  isEvmNetworkConfigured,
  type EvmNetwork,
} from "@/lib/evm/network";

/**
 * GET /api/labs/evm-config — redes EVM disponibles para crear sesiones.
 */
export async function GET() {
  const enabled = getEnabledEvmNetworks();
  const defaultNetwork = enabled.includes(getDefaultEvmNetwork())
    ? getDefaultEvmNetwork()
    : enabled[0] ?? getDefaultEvmNetwork();

  const networks = (["bsc", "ethereum", "polygon"] as EvmNetwork[]).map((id) => ({
    id,
    label: EVM_NETWORK_META[id].label,
    shortLabel: EVM_NETWORK_META[id].shortLabel,
    nativeCurrency: EVM_NETWORK_META[id].nativeCurrency,
    configured: isEvmNetworkConfigured(id),
  }));

  return NextResponse.json({
    networks,
    enabledNetworks: enabled,
    defaultNetwork,
    multiNetwork: enabled.length > 1,
  });
}
