import { NextResponse } from "next/server";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, bookings } from "@/lib/db";
import { awardForBooking, awardReferrerOnFirstCompleted } from "@/lib/loyalty";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Доначисление баллов по уже завершённым броням.
 *
 * Зачем: начисление годами вызывалось только из вебхука amoCRM, а брони приходят
 * периодической синхронизацией — из 57 завершённых броней баллы получили 3.
 * Синхронизация подтягивает только свежие сделки, поэтому прошлые ею не догнать.
 *
 * Безопасно запускать сколько угодно раз: awardForBooking идемпотентна —
 * проверяет, было ли уже начисление booking_completed по этой броне.
 *
 * Защита: Authorization: Bearer $CRON_SECRET (как у остальных cron-роутов).
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const rows = await db
    .select({ id: bookings.id, userId: bookings.userId })
    .from(bookings)
    .where(and(eq(bookings.status, "completed"), isNotNull(bookings.userId)))
    .limit(1000);

  let awarded = 0, points = 0, skipped = 0;
  const errors: string[] = [];

  for (const b of rows) {
    try {
      const r = await awardForBooking(b.id);
      if (!r) { skipped++; continue; }          // уже начислено ранее
      awarded++; points += r.awarded;
      if (b.userId) await awardReferrerOnFirstCompleted(b.userId);
    } catch (e) {
      errors.push(`${b.id}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    completedWithUser: rows.length,
    awarded,                 // сколько броней получили начисление сейчас
    points,                  // сколько баллов роздано
    alreadyAwarded: skipped,  // столько было начислено раньше
    errors,
  });
}
