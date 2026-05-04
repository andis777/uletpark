import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, bookings, users } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({
      booking: bookings,
      user: users,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(row);
}

const PatchBody = z.object({
  status: z.enum(["new", "confirmed", "active", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = PatchBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  const [updated] = await db.update(bookings).set({ ...body.data, updatedAt: sql`NOW()` }).where(eq(bookings.id, id)).returning();
  return NextResponse.json({ booking: updated });
}
