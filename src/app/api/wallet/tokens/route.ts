import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_MANAGED_TOKENS,
  managedTokenToWalletToken,
  type ManagedTokenRecord,
} from "@/lib/wallet/managed-tokens";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("wallet_managed_tokens")
      .select("*")
      .eq("is_active", true)
      .eq("network", "bsc")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const records = (data ?? []) as ManagedTokenRecord[];
    const tokens = records
      .map(managedTokenToWalletToken)
      .filter((t): t is NonNullable<typeof t> => t != null);

    return NextResponse.json({ tokens });
  } catch {
    const fallback = DEFAULT_MANAGED_TOKENS.filter((t) => t.is_active).map(
      (token, index) =>
        managedTokenToWalletToken({
          ...token,
          id: `fallback-${token.symbol.toLowerCase()}`,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })!
    );

    return NextResponse.json({ tokens: fallback, fallback: true });
  }
}
