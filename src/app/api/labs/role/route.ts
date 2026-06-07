import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLabRole } from "@/lib/labs/lab-guard";

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

  const role = await getLabRole(supabase, user.id);
  const adminEmails = (process.env.LAB_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const canBecomeInstructor =
    Boolean(user.email && adminEmails.includes(user.email.toLowerCase())) ||
    role === "instructor" ||
    role === "admin";

  return NextResponse.json({ role, canBecomeInstructor, email: user.email });
}
