import { NextResponse } from "next/server";
import { db, bookings, events } from "@/lib/db";
import { sql, gte, and, eq } from "drizzle-orm";
import { notifyTelegram } from "@/lib/notify";

/**
 * GET /api/cron/daily-report — ежедневный отчёт в Telegram-группу
 * Срабатывает ежедневно cron-контейнером в 9:00 МСК.
 * Защищён CRON_SECRET — нельзя дёрнуть снаружи.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  // За вчера
  const [{ count: leadsYesterday }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(gte(bookings.createdAt, yesterday));

  const [{ count: leadsWeek }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(gte(bookings.createdAt, weekAgo));

  // Сумма за вчера
  const [{ totalRub }] = await db
    .select({ totalRub: sql<number>`coalesce(sum(price_kopecks)/100, 0)::int` })
    .from(bookings)
    .where(gte(bookings.createdAt, yesterday));

  // Источники
  const sources = await db
    .select({
      source: bookings.source,
      count: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(gte(bookings.createdAt, yesterday))
    .groupBy(bookings.source);

  const sourcesText = sources.length > 0
    ? sources.map(s => `   ${s.source ?? "—"}: ${s.count}`).join("\n")
    : "   (нет данных)";

  const text = `📊 <b>Отчёт за ${yesterday.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</b>

🚗 Броней: <b>${leadsYesterday}</b>
💰 Сумма: <b>${totalRub.toLocaleString("ru")} ₽</b>

📈 За неделю: ${leadsWeek}
📊 Источники:
${sourcesText}

⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`;

  // Шлём как "новая заявка" но через специальный формат
  await notifyTelegram({
    name: "Daily Report",
    phone: "—",
    service: "parking",
    dateFrom: yesterday.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
    notes: text,
    source: "cron-daily",
  });

  return NextResponse.json({
    ok: true,
    stats: { leadsYesterday, totalRub, leadsWeek, sources },
  });
}
