import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Cron: пересчитывает materialized views для аналитики.
 * Конфигурируется в vercel.json или vercel.ts:
 *   crons: [{ path: "/api/cron/refresh-analytics", schedule: "0 */1 * * *" }]
 *
 * Защита: header Authorization: Bearer $CRON_SECRET (Vercel ставит автоматически).
 */

export async function GET(req: Request) {
  // Vercel Cron шлёт Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const t0 = Date.now();
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_first_seen`);
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_active`);
  return NextResponse.json({ ok: true, ms: Date.now() - t0 });
}
