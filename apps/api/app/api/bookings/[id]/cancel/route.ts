import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db, bookings } from "@/lib/db";
import { getUserFromHeader } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;

  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.userId, auth.sub)))
    .limit(1);

  if (!b) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (b.status === "cancelled" || b.status === "completed") {
    return NextResponse.json({ error: "ALREADY_CLOSED", status: b.status }, { status: 409 });
  }

  // TODO: вызвать amoCRM /api/v4/leads/:id PATCH чтобы переключить status_id на 143 (закрыто)
  // Пока — только локально:
  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled", updatedAt: sql`NOW()` })
    .where(eq(bookings.id, id))
    .returning();

  return NextResponse.json({ ok: true, status: updated.status });
}
