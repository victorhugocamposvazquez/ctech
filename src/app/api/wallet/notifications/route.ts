import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWalletAddress } from "@/lib/wallet/managed-tokens";
import { watchWalletTransfersForAddress } from "@/lib/wallet/transfer-watcher";
import { isAddress } from "viem";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawAddress = url.searchParams.get("address")?.trim() ?? "";
  const unreadOnly = url.searchParams.get("unread") === "1";
  const scan = url.searchParams.get("scan") !== "0";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

  if (!isAddress(rawAddress)) {
    return NextResponse.json({ error: "Dirección inválida" }, { status: 400 });
  }

  const walletAddress = normalizeWalletAddress(rawAddress);

  try {
    const supabase = createAdminClient();

    if (scan) {
      try {
        await watchWalletTransfersForAddress(supabase, walletAddress);
      } catch (scanErr) {
        console.warn("[wallet/notifications] scan failed:", scanErr);
      }
    }

    let query = supabase
      .from("wallet_notifications")
      .select("*")
      .eq("wallet_address", walletAddress)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { count: unreadCount } = await supabase
      .from("wallet_notifications")
      .select("*", { count: "exact", head: true })
      .eq("wallet_address", walletAddress)
      .is("read_at", null);

    return NextResponse.json({
      notifications: data ?? [],
      unreadCount: unreadCount ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
