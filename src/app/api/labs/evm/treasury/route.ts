import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor, logLabAudit, getClientIp } from "@/lib/labs/lab-guard";
import { getTreasuryNativeBalance } from "@/lib/evm/deploy-service";
import type { EvmNetwork } from "@/lib/evm/network";
import {
  fetchActivePanelTreasury,
  getEnvTreasuryCredentials,
  isTreasuryReady,
  maskPrivateKeyHint,
  resolveTreasuryCredentials,
  validateTreasuryInput,
} from "@/lib/evm/treasury-registry";

const BALANCE_NETWORKS: EvmNetwork[] = ["bsc", "ethereum"];

/**
 * GET  /api/labs/evm/treasury — estado (sin devolver la private key)
 * PUT  /api/labs/evm/treasury — guardar dirección + key desde el panel
 * DELETE /api/labs/evm/treasury — borrar config del panel
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const authCheck = await assertInstructor(supabase, user.id);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const envTreasury = getEnvTreasuryCredentials();
  const panelRow = await fetchActivePanelTreasury(admin);
  const active = await resolveTreasuryCredentials(admin);
  const ready = await isTreasuryReady(admin);

  const balances = [];
  if (active?.address) {
    for (const network of BALANCE_NETWORKS) {
      try {
        const bal = await getTreasuryNativeBalance(network, active.address);
        if (bal) balances.push({ network, ...bal });
      } catch {
        /* RPC opcional */
      }
    }
  }

  return NextResponse.json({
    ready,
    activeSource: active?.source ?? "none",
    envConfigured: Boolean(envTreasury),
    envAddress: envTreasury?.address ?? null,
    panel: panelRow
      ? {
          address: panelRow.treasury_address,
          label: panelRow.label,
          notes: panelRow.notes,
          privateKeyHint: maskPrivateKeyHint(panelRow.treasury_private_key),
          updatedAt: panelRow.updated_at,
        }
      : null,
    activeAddress: active?.address ?? null,
    balances,
    priorityNote:
      envTreasury && panelRow
        ? "La variable EVM_LAB_TREASURY_PRIVATE_KEY en Vercel tiene prioridad sobre el panel."
        : envTreasury
          ? "Treasury activa desde variable de entorno."
          : panelRow
            ? "Treasury activa desde panel."
            : "Configura treasury en el panel o en EVM_LAB_TREASURY_PRIVATE_KEY.",
  });
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const authCheck = await assertInstructor(supabase, user.id);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await req.json();
  const address = String(body.treasuryAddress ?? body.address ?? "").trim();
  const privateKey = String(body.treasuryPrivateKey ?? body.privateKey ?? "").trim();
  const label = body.label ? String(body.label).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const existing = await fetchActivePanelTreasury(admin);

  if (!privateKey && !existing) {
    return NextResponse.json({ error: "Private key obligatoria en el primer guardado" }, { status: 400 });
  }

  const validation = privateKey
    ? validateTreasuryInput(address, privateKey)
    : existing
      ? ({ ok: true } as const)
      : validateTreasuryInput(address, privateKey);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const keyToStore = privateKey
    ? privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`
    : existing!.treasury_private_key;

  if (existing) {
    await admin.from("lab_evm_treasury").update({ is_active: false }).eq("id", existing.id);
  }

  const { data: row, error } = await admin
    .from("lab_evm_treasury")
    .insert({
      treasury_address: address,
      treasury_private_key: keyToStore,
      label,
      notes,
      configured_by: user.id,
      is_active: true,
    })
    .select("id, treasury_address, label, notes, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logLabAudit(supabase, {
    userId: user.id,
    action: "evm_treasury_panel_saved",
    metadata: { address, label: label ?? undefined },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    panel: {
      ...row,
      privateKeyHint: maskPrivateKeyHint(keyToStore),
    },
    message: getEnvTreasuryCredentials()
      ? "Guardado en panel. Nota: si existe EVM_LAB_TREASURY_PRIVATE_KEY en env, esa key sigue teniendo prioridad."
      : "Treasury guardada. Ya puedes desplegar contratos e inyectar.",
  });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const authCheck = await assertInstructor(supabase, user.id);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const existing = await fetchActivePanelTreasury(admin);
  if (existing) {
    await admin.from("lab_evm_treasury").update({ is_active: false }).eq("id", existing.id);
  }

  await logLabAudit(supabase, {
    userId: user.id,
    action: "evm_treasury_panel_cleared",
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true });
}
