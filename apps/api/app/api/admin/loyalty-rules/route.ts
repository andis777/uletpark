import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { db, loyaltyRules } from "@/lib/db";

/**
 * Защита /api/admin/* — пока заголовком X-Admin-Key (env ADMIN_KEY).
 * В Phase 3 заменим на нормальную сессию админа (cookie + Better-Auth).
 */
function checkAdmin(req: Request): boolean {
  const got = req.headers.get("x-admin-key");
  return !!got && got === process.env.ADMIN_KEY;
}

export async function GET(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const rows = await db.select().from(loyaltyRules).orderBy(asc(loyaltyRules.createdAt));
  return NextResponse.json({ rules: rows });
}

const Body = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["cashback_pct", "tier_threshold", "referral_bonus"]),
  config: z.record(z.unknown()),
  active: z.boolean().default(true),
});

export async function POST(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY", issues: body.error.issues }, { status: 400 });
  const [created] = await db.insert(loyaltyRules).values(body.data).returning();
  return NextResponse.json({ rule: created });
}

const PatchBody = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  active: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

export async function PATCH(req: Request) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = PatchBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  const { id, ...patch } = body.data;
  const [updated] = await db.update(loyaltyRules).set({ ...patch, updatedAt: new Date() }).where(eq(loyaltyRules.id, id)).returning();
  return NextResponse.json({ rule: updated });
}
