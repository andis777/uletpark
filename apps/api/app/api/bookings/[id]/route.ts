import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, bookings } from "@/lib/db";
import { getUserFromHeader } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await params;

  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.userId, auth.sub)))
    .limit(1);

  if (!b) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    booking: {
      id: b.id,
      airport: b.airport,
      dateFrom: b.dateFrom.toISOString(),
      dateTo: b.dateTo.toISOString(),
      priceRub: Math.round(b.priceKopecks / 100),
      status: b.status,
      carNumber: b.carNumber,
      carModel: b.carModel,
      loyaltyPointsEarned: b.loyaltyPointsEarned,
      loyaltyPointsUsed: b.loyaltyPointsUsed,
      source: b.source,
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
      amocrmLeadId: b.amocrmLeadId,
    },
  });
}
