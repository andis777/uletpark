import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, bookings, bookingChangeRequests } from "@/lib/db";
import { getCurrentClient } from "@/lib/cabinet-auth";
import { notifyBookingExtend } from "@/lib/notify";

export const dynamic = "force-dynamic";

const Body = z.object({
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  comment: z.string().max(300).optional(),
});

/**
 * Запрос на продление брони.
 *
 * Именно запрос, а не правка: цена зависит от срока, подтверждает её менеджер —
 * так работает весь бизнес. Клиент видит «отправлено», дальше ему звонят.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentClient();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  // Только своя бронь — иначе можно продлить чужую.
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.userId, user.id)))
    .limit(1);
  if (!b) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (b.status === "cancelled" || b.status === "completed") {
    return NextResponse.json({ error: "BOOKING_CLOSED" }, { status: 409 });
  }

  // Полдень по Москве: дата без времени иначе трактуется как UTC и «уезжает» на день назад.
  const newDateTo = new Date(parsed.data.dateTo + "T12:00:00+03:00");
  if (Number.isNaN(newDateTo.getTime()) || newDateTo <= b.dateTo) {
    return NextResponse.json({ error: "DATE_NOT_LATER" }, { status: 400 });
  }

  const [created] = await db
    .insert(bookingChangeRequests)
    .values({
      bookingId: b.id,
      userId: user.id,
      kind: "extend",
      newDateTo,
      comment: parsed.data.comment ?? null,
    })
    .returning();

  // Заявка уже сохранена — падение уведомления не должно её терять.
  notifyBookingExtend({
    userName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "—",
    phone: user.phone ?? undefined,
    email: user.email ?? undefined,
    carNumber: b.carNumber ?? undefined,
    from: b.dateFrom,
    wasTo: b.dateTo,
    newTo: newDateTo,
    comment: parsed.data.comment,
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: created.id });
}
