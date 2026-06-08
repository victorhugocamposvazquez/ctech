import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstructor, logLabAudit, getClientIp } from "@/lib/labs/lab-guard";
import { getTreasuryNativeBalance } from "@/lib/evm/deploy-service";
import type { EvmNetwork } from "@/lib/evm/network";
import {
  fetchActivePanelTreasury,
  fetchLatestPanelTreasury,
  getEnvTreasuryCredentials,
  isTreasuryReady,
  panelRowToDisplay,
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

  const authCheck = await assertInstructor(supabase, user.id, user.email);
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
  const activeRow = await fetchActivePanelTreasury(admin);
  const latestRow = activeRow ?? (await fetchLatestPanelTreasury(admin));
  const panelRow = latestRow;
  const panelInactive = Boolean(latestRow && !latestRow.is_active);
  const active = await resolveTreasuryCredentials(admin);
  const ready = await isTreasuryReady(admin);

  const balances: { network: string; address: string; balance: string; symbol: string }[] = [];
  if (active?.address) {
    await Promise.all(
      BALANCE_NETWORKS.map(async (network) => {
        try {
          const bal = await getTreasuryNativeBalance(network, active.address);
          if (bal) balances.push({ network, ...bal });
        } catch {
          /* RPC opcional */
        }
      })
    );
  }

  return NextResponse.json({
    ready,
    activeSource: active?.source ?? "none",
    envConfigured: Boolean(envTreasury),
    envAddress: envTreasury?.address ?? null,
    panel: panelRow ? panelRowToDisplay(panelRow) : null,
    panelInactive,
    activeAddress: active?.address ?? panelRow?.treasury_address ?? null,
    balances,
    priorityNote:
      panelInactive
        ? "Treasury encontrada pero desactivada. Pulsa Guardar (con private key) para reactivarla."
        : envTreasury && activeRow
          ? "La variable EVM_LAB_TREASURY_PRIVATE_KEY en Vercel tiene prioridad sobre el panel."
          : envTreasury
            ? "Treasury activa desde variable de entorno."
            : activeRow
              ? "Treasury activa desde panel."
              : panelRow
                ? "Hay datos en panel pero la key no es válida. Vuelve a guardar dirección + private key."
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

  const authCheck = await assertInstructor(supabase, user.id, user.email);
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

  const activeExisting = await fetchActivePanelTreasury(admin);
  const recoverRow = activeExisting ?? (await fetchLatestPanelTreasury(admin));

  if (!privateKey && !recoverRow) {
    return NextResponse.json({ error: "Private key obligatoria en el primer guardado" }, { status: 400 });
  }

  const validation = privateKey
    ? validateTreasuryInput(address, privateKey)
    : recoverRow
      ? ({ ok: true } as const)
      : validateTreasuryInput(address, privateKey);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const keyToStore = privateKey
    ? privateKey.startsWith("0x")
      ? privateKey
      : `0x${privateKey}`
    : recoverRow!.treasury_private_key;

  let row: {
    id: string;
    treasury_address: string;
    label: string | null;
    notes: string | null;
    updated_at: string;
  } | null = null;
  let saveError: string | null = null;

  if (recoverRow) {
    const { data, error } = await admin
      .from("lab_evm_treasury")
      .update({
        treasury_address: address,
        treasury_private_key: keyToStore,
        label,
        notes,
        configured_by: user.id,
        is_active: true,
      })
      .eq("id", recoverRow.id)
      .select("id, treasury_address, label, notes, updated_at")
      .single();
    row = data;
    saveError = error?.message ?? null;
  } else {
    const { data, error } = await admin
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
    row = data;
    saveError = error?.message ?? null;
  }

  if (saveError || !row) {
    return NextResponse.json(
      {
        error:
          saveError ??
          "No se pudo guardar. ¿Existe la tabla lab_evm_treasury? Aplica la migración en Supabase.",
      },
      { status: 500 }
    );
  }

  await logLabAudit(supabase, {
    userId: user.id,
    action: "evm_treasury_panel_saved",
    metadata: { address, label: label ?? undefined },
    ipAddress: getClientIp(req),
  });

  const activeAfterSave = await resolveTreasuryCredentials(admin);

  return NextResponse.json({
    success: true,
    ready: Boolean(activeAfterSave),
    activeSource: activeAfterSave?.source ?? "none",
    activeAddress: activeAfterSave?.address ?? null,
    panel: panelRowToDisplay({
      id: row.id,
      treasury_address: row.treasury_address,
      treasury_private_key: keyToStore,
      label: row.label,
      notes: row.notes,
      configured_by: user.id,
      is_active: true,
      updated_at: row.updated_at,
    }),
    panelInactive: false,
    message: getEnvTreasuryCredentials()
      ? "Guardado en panel. Nota: si existe EVM_LAB_TREASURY_PRIVATE_KEY en env, esa key sigue teniendo prioridad."
      : activeAfterSave
        ? "Treasury guardada. Envía BNB (BSC) y/o ETH para desplegar contratos."
        : "Guardado en panel, pero no se pudo activar la treasury. Revisa dirección y private key.",
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

  const authCheck = await assertInstructor(supabase, user.id, user.email);
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
