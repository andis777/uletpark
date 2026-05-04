import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromHeader } from "@/lib/auth";
import { applyReferralCode } from "@/lib/loyalty";

const Body = z.object({ code: z.string().min(4).max(16) });

export async function POST(req: Request) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const r = await applyReferralCode({ newUserId: auth.sub, code: body.data.code });
  if (!r.ok) return NextResponse.json({ error: r.reason }, { status: 400 });

  return NextResponse.json({ ok: true, bonusRub: r.bonusRub });
}
