import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, bookings, users } from "@/lib/db";
import { getUserFromHeader, normalizePhone } from "@/lib/auth";
import { calculate } from "@/lib/calculator";
import { createLead, findOrCreateContactByPhone } from "@/lib/amocrm";
import { redeemForBooking } from "@/lib/loyalty";
import { notifyClient, notifyTelegram } from "@/lib/notify";
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
  email: z.string().email().optional(),
  // Нужен только тем, кто зарегистрировался по почте и ещё не указал телефон.
  // Без телефона мы не сможем ни позвонить, ни подать трансфер.
  phone: z.string().optional(),
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
  let [user] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  // Пользователь, вошедший по e-mail, телефона ещё не имеет. Просим его здесь —
  // на первой броне, когда он реально нужен (звонок диспетчера, трансфер, amoCRM).
  if (!user.phone) {
    const phone = body.data.phone ? normalizePhone(body.data.phone) : null;
    if (!phone) {
      return NextResponse.json(
        { error: "PHONE_REQUIRED", message: "Укажите номер телефона — по нему подтвердим бронь и подадим трансфер." },
        { status: 400 }
      );
    }
    // Телефон уникален: если он уже занят другим аккаунтом — не сливаем автоматически.
    const [owner] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (owner && owner.id !== user.id) {
      return NextResponse.json(
        { error: "PHONE_TAKEN", message: "Этот номер уже привязан к другому аккаунту. Войдите по номеру телефона." },
        { status: 409 }
      );
    }
    const contact = await findOrCreateContactByPhone(phone).catch(() => ({ id: null as number | null, name: null }));
    [user] = await db
      .update(users)
      .set({
        phone,
        amocrmContactId: user.amocrmContactId ?? contact.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    console.log(`[bookings] телефон добавлен пользователю ${user.id} при первой броне`);
  }

  // amoCRM: создаём сделку в воронке «Улетная парковка». Не блокируем бронь,
  // если CRM недоступна/лимит — заявка всё равно сохранится и уйдёт в Telegram.
  // После блока выше телефон гарантированно есть. Фиксируем в локальной
  // переменной — и для типов, и как страховка от регрессий.
  const userPhone = user.phone;
  if (!userPhone) return NextResponse.json({ error: "PHONE_REQUIRED" }, { status: 400 });

  const clientName = [user.firstName, user.lastName].filter(Boolean).join(" ") || userPhone;
  let lead: { id: number } | null = null;
  try {
    lead = await createLead({
      name: `Бронь ${body.data.airport} ${body.data.carNumber} · ${userPhone}`,
      price: calc.finalRub,
      contactId: user.amocrmContactId ?? undefined,
      amo: {
        airport: body.data.airport,
        dateFrom: body.data.dateFrom.slice(0, 10),
        dateTo: body.data.dateTo.slice(0, 10),
        carNumber: body.data.carNumber,
        phone: userPhone,
        clientName,
      },
    });
  } catch (e) {
    console.warn("[bookings] amoCRM createLead failed:", (e as Error).message);
  }

  const [created] = await db
    .insert(bookings)
    .values({
      amocrmLeadId: lead?.id ?? null,
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

  // Уведомления: Telegram-группе + email клиенту (если указал email).
  // Параллельно, не блокирует ответ.
  console.log(`[bookings] created ${created.id} for ${userPhone} · ${calc.finalRub}₽`);
  const notifyPayload = {
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Клиент",
    phone: userPhone,
    service: (body.data.service ?? "parking") as "parking" | "nochevka",
    dateFrom: created.dateFrom.toISOString().slice(0, 10),
    dateTo: created.dateTo.toISOString().slice(0, 10),
    price: calc.finalRub,
    airport: created.airport,
    carNumber: created.carNumber ?? undefined,
    source: "mobile-app",
  };
  Promise.all([
    notifyTelegram(notifyPayload),
    body.data.email ? notifyClient({ ...notifyPayload, email: body.data.email }) : Promise.resolve({ ok: false }),
  ]).catch(e => console.warn("[bookings] notify failed:", e));

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
