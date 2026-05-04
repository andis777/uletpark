import { NextResponse } from "next/server";
import { z } from "zod";
import { loginAdmin, setAdminCookie } from "@/lib/admin-auth";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const session = await loginAdmin(body.data.email, body.data.password);
  if (!session) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  await setAdminCookie(session);
  return NextResponse.json({ ok: true, admin: { email: session.email, role: session.role } });
}
