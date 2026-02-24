import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DexScreenerClient } from "@/lib/market/dexscreener";

export interface LivePriceRow {
  id: string;
  symbol: string;
  tokenAddress: string;
  network: string;
  dexUrl: string;
  entryPrice: number;
  currentPrice: number;
  pnlPct: number;
  priceChange24h: number;
  priceChange1h: number;
  liquidityUsd: number;
  openedAt: string;
}

/**
 * GET /api/positions/live-prices
 *
 * Obtiene precios en tiempo real para posiciones abiertas.
 * Consulta DexScreener para cada token y devuelve precio actual,
 * PnL %, variación 24h/1h y enlace al chart.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: trades } = await supabase
    .from("trades")
    .select("id, symbol, entry_price, opened_at, metadata")
    .eq("user_id", user.id)
    .eq("status", "open")
    .eq("execution_mode", "paper");

  if (!trades || trades.length === 0) {
    return NextResponse.json({ positions: [] });
  }

  const dex = new DexScreenerClient();
  const results: LivePriceRow[] = [];

  for (const t of trades) {
    const meta = (t.metadata ?? {}) as Record<string, unknown>;
    const tokenAddress = String(meta.tokenAddress ?? "").trim();
    const network = String(meta.network ?? "solana").toLowerCase();

    if (!tokenAddress) {
      results.push({
        id: t.id,
        symbol: t.symbol,
        tokenAddress: "",
        network,
        dexUrl: "",
        entryPrice: Number(t.entry_price) || 0,
        currentPrice: 0,
        pnlPct: 0,
        priceChange24h: 0,
        priceChange1h: 0,
        liquidityUsd: 0,
        openedAt: t.opened_at,
      });
      continue;
    }

    try {
      const pair = await dex.getBestPair(network, tokenAddress);
      if (!pair) {
        results.push({
          id: t.id,
          symbol: t.symbol,
          tokenAddress,
          network,
          dexUrl: "",
          entryPrice: Number(t.entry_price) || 0,
          currentPrice: 0,
          pnlPct: 0,
          priceChange24h: 0,
          priceChange1h: 0,
          liquidityUsd: 0,
          openedAt: t.opened_at,
        });
        continue;
      }

      const entryPrice = Number(t.entry_price) || 0;
      const currentPrice = parseFloat(pair.priceUsd) || 0;
      const pnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
      const priceChange24h = pair.priceChange?.h24 ?? 0;
      const priceChange1h = pair.priceChange?.h1 ?? 0;
      const liquidityUsd = pair.liquidity?.usd ?? 0;

      results.push({
        id: t.id,
        symbol: t.symbol,
        tokenAddress,
        network,
        dexUrl: pair.url ?? `https://dexscreener.com/${network}/${tokenAddress}`,
        entryPrice,
        currentPrice,
        pnlPct,
        priceChange24h,
        priceChange1h,
        liquidityUsd,
        openedAt: t.opened_at,
      });
    } catch {
      results.push({
        id: t.id,
        symbol: t.symbol,
        tokenAddress,
        network,
        dexUrl: `https://dexscreener.com/${network}/${tokenAddress}`,
        entryPrice: Number(t.entry_price) || 0,
        currentPrice: 0,
        pnlPct: 0,
        priceChange24h: 0,
        priceChange1h: 0,
        liquidityUsd: 0,
        openedAt: t.opened_at,
      });
    }
  }

  return NextResponse.json({ positions: results });
}
