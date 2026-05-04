import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql, desc } from "drizzle-orm";
import { db, users, bookings, loyaltyTransactions } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const userBookings = await db.select().from(bookings).where(eq(bookings.userId, id)).orderBy(desc(bookings.createdAt)).limit(50);
  const txs = await db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.userId, id)).orderBy(desc(loyaltyTransactions.createdAt)).limit(50);

  return NextResponse.json({ user: u, bookings: userBookings, transactions: txs });
}

const PatchBody = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  loyaltyTier: z.enum(["bronze", "silver", "gold"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = PatchBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  const [u] = await db.update(users).set({ ...body.data, updatedAt: sql`NOW()` }).where(eq(users.id, id)).returning();
  return NextResponse.json({ user: u });
}
