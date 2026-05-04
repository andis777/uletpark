import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, users, loyaltyTransactions } from "@/lib/db";

const Body = z.object({
  userId: z.string().uuid(),
  delta: z.number().int(),                  // +/-
  reason: z.string().min(1).max(120).default("manual_adjust"),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY", issues: body.error.issues }, { status: 400 });

  const [u] = await db.select().from(users).where(eq(users.id, body.data.userId)).limit(1);
  if (!u) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const newPoints = u.loyaltyPoints + body.data.delta;
  if (newPoints < 0) return NextResponse.json({ error: "INSUFFICIENT_POINTS" }, { status: 400 });

  await db.insert(loyaltyTransactions).values({
    userId: u.id,
    deltaPoints: body.data.delta,
    reason: body.data.reason,
  });
  await db.update(users).set({ loyaltyPoints: newPoints, updatedAt: sql`NOW()` }).where(eq(users.id, u.id));

  return NextResponse.json({ ok: true, newPoints });
}
