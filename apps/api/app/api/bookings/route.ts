import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, bookings, users } from "@/lib/db";
import { getUserFromHeader } from "@/lib/auth";
import { calculate } from "@/lib/calculator";
import { createLead } from "@/lib/amocrm";
import { redeemForBooking } from "@/lib/loyalty";
import type { BookingDTO } from "@uletnaya/shared";

export async function GET(req: Request) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, auth.sub))
    .orderBy(desc(bookings.dateFrom))
    .limit(50);

  const dto: BookingDTO[] = rows.map((b) => ({
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
    createdAt: b.createdAt.toISOString(),
  }));

  return NextResponse.json({ bookings: dto });
}

const Body = z.object({
  airport: z.enum(["SVO", "DME", "VKO"]),
  dateFrom: z.string().datetime(),
  dateTo: z.string().datetime(),
  carNumber: z.string().min(1).max(15),
  carModel: z.string().optional(),
  notes: z.string().optional(),
  promoCode: z.string().optional(),
  useLoyaltyPoints: z.number().int().nonnegative().optional(),
  service: z.enum(["parking", "nochevka"]).optional(),
  nochevkaHours: z.union([z.literal(6), z.literal(12), z.literal(24)]).optional(),
});

export async function POST(req: Request) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY", issues: body.error.issues }, { status: 400 });

  const calc = calculate(body.data);
  const [user] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  // amoCRM lead создаём ДО списания баллов чтобы при ошибке не списать впустую
  const lead = await createLead({
    name: `Бронь ${body.data.airport} ${body.data.carNumber}`,
    price: calc.finalRub,
    contactId: user.amocrmContactId ?? undefined,
  });

  const [created] = await db
    .insert(bookings)
    .values({
      amocrmLeadId: lead.id,
      userId: user.id,
      airport: body.data.airport,
      dateFrom: new Date(body.data.dateFrom),
      dateTo: new Date(body.data.dateTo),
      priceKopecks: calc.finalRub * 100,
      status: "new",
      carNumber: body.data.carNumber,
      carModel: body.data.carModel,
      source: "app",
      rawAmocrm: lead as unknown as Record<string, unknown>,
      loyaltyPointsUsed: 0,
      notes: body.data.notes,
    })
    .returning();

  // Списание баллов после успешного создания брони
  let redeemed = { redeemed: 0, remainingPoints: user.loyaltyPoints };
  if ((body.data.useLoyaltyPoints ?? 0) > 0) {
    redeemed = await redeemForBooking({
      userId: user.id,
      bookingId: created.id,
      pointsRequested: body.data.useLoyaltyPoints!,
      maxPriceRub: calc.totalRub - calc.discountRub,   // не списываем больше суммы покупки
    });
    if (redeemed.redeemed > 0) {
      await db.update(bookings)
        .set({ loyaltyPointsUsed: redeemed.redeemed })
        .where(eq(bookings.id, created.id));
    }
  }

  return NextResponse.json({
    booking: {
      id: created.id,
      airport: created.airport,
      dateFrom: created.dateFrom.toISOString(),
      dateTo: created.dateTo.toISOString(),
      priceRub: calc.finalRub,
      status: created.status,
      pointsToEarn: calc.pointsToEarn,
      pointsUsed: redeemed.redeemed,
    },
    calc,
    loyalty: {
      pointsRemaining: redeemed.remainingPoints,
    },
  });
}
