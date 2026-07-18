import { NextResponse } from "next/server";
import { requireBackofficeAdmin } from "@/lib/backoffice/auth";
import { revertSimulatedOperation } from "@/lib/wallet/simulated-credit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, supabase } = await requireBackofficeAdmin();
  if (error || !supabase) {
    return error ?? NextResponse.json({ error: "Error interno" }, { status: 500 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  try {
    const result = await revertSimulatedOperation(supabase, id.trim());
    return NextResponse.json({ ok: true, reversal: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      message.includes("no encontrada") || message.includes("ya fue revertida")
        ? 400
        : message.includes("insuficiente")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
