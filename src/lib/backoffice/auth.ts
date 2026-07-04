import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export function isBackofficeAdmin(email: string | undefined | null): boolean {
  const raw = process.env.BACKOFFICE_ADMIN_EMAILS?.trim();
  if (!raw) return true;

  const admins = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return !!email && admins.includes(email.toLowerCase());
}

export async function requireBackofficeAdmin(): Promise<{
  error: NextResponse | null;
  user: { id: string; email?: string } | null;
  supabase: SupabaseClient | null;
}> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
      user: null,
      supabase: null,
    };
  }

  if (!isBackofficeAdmin(user.email)) {
    return {
      error: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }),
      user: null,
      supabase: null,
    };
  }

  try {
    return { error: null, user, supabase: createAdminClient() };
  } catch (err) {
    return {
      error: NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      ),
      user: null,
      supabase: null,
    };
  }
}
