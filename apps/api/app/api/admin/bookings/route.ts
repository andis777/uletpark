import { NextResponse } from "next/server";
import { z } from "zod";
import { sql, desc, and, eq, like, or, gte, lte } from "drizzle-orm";
import { db, bookings, users } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const airport = url.searchParams.get("airport") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "30")));

  const conds = [];
  if (q) conds.push(or(
    like(bookings.carNumber, `%${q.toUpperCase()}%`),
    like(bookings.carModel, `%${q}%`),
    like(users.phone, `%${q}%`),
    like(users.firstName, `%${q}%`),
  ));
  if (status) conds.push(eq(bookings.status, status as "new"));
  if (airport) conds.push(eq(bookings.airport, airport as "SVO"));
  if (from) conds.push(gte(bookings.dateFrom, new Date(from)));
  if (to) conds.push(lte(bookings.dateTo, new Date(to)));

  const where = conds.length > 0 ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: bookings.id,
      airport: bookings.airport,
      dateFrom: bookings.dateFrom,
      dateTo: bookings.dateTo,
      priceKopecks: bookings.priceKopecks,
      status: bookings.status,
      carNumber: bookings.carNumber,
      carModel: bookings.carModel,
      source: bookings.source,
      createdAt: bookings.createdAt,
      amocrmLeadId: bookings.amocrmLeadId,
      userPhone: users.phone,
      userFirstName: users.firstName,
      userId: users.id,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(where);

  return NextResponse.json({ rows, total, page, limit });
}

const PatchBody = z.object({
  status: z.enum(["new", "confirmed", "active", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  const body = PatchBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const [updated] = await db.update(bookings).set({ ...body.data, updatedAt: sql`NOW()` }).where(eq(bookings.id, id)).returning();
  // TODO: при изменении status → PATCH в amoCRM (когда discovery завершён)
  return NextResponse.json({ booking: updated });
}
