import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SignalDecayAnalyzer } from "@/lib/engine/signal-decay";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analyzer = new SignalDecayAnalyzer(supabase);
  const report = await analyzer.analyze(user.id);
  return NextResponse.json(report);
}
