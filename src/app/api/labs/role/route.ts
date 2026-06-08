import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLabRole, isLabAdminEmail } from "@/lib/labs/lab-guard";

/**
 * GET /api/labs/role — current lab role
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const role = await getLabRole(supabase, user.id, user.email);
  const canBecomeInstructor =
    isLabAdminEmail(user.email) || role === "instructor" || role === "admin";

  return NextResponse.json({ role, canBecomeInstructor, email: user.email });
}
