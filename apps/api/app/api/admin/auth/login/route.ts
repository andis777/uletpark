import { NextResponse } from "next/server";
import { z } from "zod";
import { loginAdmin, setAdminCookie } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const session = await loginAdmin(body.data.email, body.data.password);
  if (!session) {
    await logAudit({ action: "login_failed", payload: { email: body.data.email }, req });
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  await setAdminCookie(session);
  await logAudit({ admin: session, action: "login_success", req });
  return NextResponse.json({ ok: true, admin: { email: session.email, role: session.role } });
}
