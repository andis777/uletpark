import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  // Воронка за 30 дней (от события к событию)
  const funnel = await db.execute<{ event_name: string; cnt: number }>(sql`
    SELECT event_name, count(distinct coalesce(user_id::text, session_id))::int as cnt
    FROM events
    WHERE ts > now() - interval '30 days'
      AND event_name IN ('page_view', 'app_open', 'calc_started', 'booking_started', 'booking_created')
    GROUP BY event_name
  `);

  // Cohort retention: % новых пользователей вернулись через 7/30 дней
  const cohorts = await db.execute<{ cohort: string; size: number; w1: number; m1: number }>(sql`
    WITH first_seen AS (
      SELECT user_id,
             min(ts) as first_ts,
             to_char(date_trunc('week', min(ts)), 'YYYY-WW') as cohort
      FROM events
      WHERE user_id IS NOT NULL
      GROUP BY user_id
    ),
    activity AS (
      SELECT fs.cohort, fs.user_id,
             max(case when e.ts > fs.first_ts + interval '7 days' and e.ts <= fs.first_ts + interval '14 days' then 1 else 0 end) as w1,
             max(case when e.ts > fs.first_ts + interval '30 days' and e.ts <= fs.first_ts + interval '37 days' then 1 else 0 end) as m1
      FROM first_seen fs
      LEFT JOIN events e ON e.user_id = fs.user_id
      GROUP BY fs.cohort, fs.user_id
    )
    SELECT cohort,
           count(*)::int as size,
           sum(w1)::int as w1,
           sum(m1)::int as m1
    FROM activity
    GROUP BY cohort
    ORDER BY cohort DESC
    LIMIT 8
  `);

  // Conversions: все брони → процент по аэропортам
  const byAirport = await db.execute<{ airport: string; total: number; completed: number; revenue: number }>(sql`
    SELECT airport,
           count(*)::int as total,
           sum(case when status = 'completed' then 1 else 0 end)::int as completed,
           coalesce(sum(case when status = 'completed' then price_kopecks else 0 end), 0)::int as revenue
    FROM bookings
    WHERE created_at > now() - interval '30 days'
    GROUP BY airport
    ORDER BY airport
  `);

  return NextResponse.json({ funnel, cohorts, byAirport });
}
