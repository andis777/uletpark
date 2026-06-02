import { NextResponse } from "next/server";
import { db, bookings, users } from "@/lib/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/driver?date=2026-06-01
 *   Возвращает все трансферы на указанную дату (default — сегодня):
 *   - заезды (dateFrom == date)
 *   - выезды (dateTo == date)
 * Сортирует по времени, group'ит в pickup/dropoff.
 */

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const date = new Date(dateParam + "T00:00:00Z");
  const dayEnd = new Date(date.getTime() + 86_400_000);

  // Заезды и выезды на эту дату
  const pickups = await db
    .select({
      id: bookings.id,
      airport: bookings.airport,
      dateFrom: bookings.dateFrom,
      dateTo: bookings.dateTo,
      carNumber: bookings.carNumber,
      carModel: bookings.carModel,
      status: bookings.status,
      userId: bookings.userId,
      notes: bookings.notes,
      priceRub: bookings.priceRub,
    })
    .from(bookings)
    .where(and(
      gte(bookings.dateFrom, date),
      lte(bookings.dateFrom, dayEnd),
      inArray(bookings.status, ["new", "confirmed", "active"]),
    ))
    .orderBy(bookings.dateFrom);

  const dropoffs = await db
    .select({
      id: bookings.id,
      airport: bookings.airport,
      dateFrom: bookings.dateFrom,
      dateTo: bookings.dateTo,
      carNumber: bookings.carNumber,
      carModel: bookings.carModel,
      status: bookings.status,
      userId: bookings.userId,
      notes: bookings.notes,
      priceRub: bookings.priceRub,
    })
    .from(bookings)
    .where(and(
      gte(bookings.dateTo, date),
      lte(bookings.dateTo, dayEnd),
      inArray(bookings.status, ["confirmed", "active"]),
    ))
    .orderBy(bookings.dateTo);

  // Подгружаем пользователей пачкой
  const userIds = Array.from(new Set([
    ...pickups.map(p => p.userId),
    ...dropoffs.map(p => p.userId),
  ].filter(Boolean) as string[]));

  const usersMap = new Map<string, { name: string; phone: string }>();
  if (userIds.length > 0) {
    const rows = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone })
      .from(users)
      .where(inArray(users.id, userIds));
    for (const u of rows) {
      usersMap.set(u.id, {
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Гость",
        phone: u.phone,
      });
    }
  }

  function enrich(rows: typeof pickups) {
    return rows.map(r => ({
      ...r,
      client: r.userId ? usersMap.get(r.userId) ?? null : null,
    }));
  }

  return NextResponse.json({
    date: dateParam,
    pickups: enrich(pickups),
    dropoffs: enrich(dropoffs),
    counts: { pickups: pickups.length, dropoffs: dropoffs.length },
  });
}
