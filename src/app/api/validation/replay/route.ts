import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ReplayEngine } from "@/lib/engine/replay-engine";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const engine = new ReplayEngine(supabase);
  const report = await engine.replay(user.id);
  return NextResponse.json(report);
}
