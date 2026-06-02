import { NextResponse } from "next/server";
import { clearAdminCookie, getAdminFromCookie } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const admin = await getAdminFromCookie();
  await clearAdminCookie();
  if (admin) await logAudit({ admin, action: "logout", req });
  return NextResponse.json({ ok: true });
}
