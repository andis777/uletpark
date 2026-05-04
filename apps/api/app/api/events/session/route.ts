import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Агрегация сессий за последние 30 дней.
 * Used by /admin/analytics для retention/sessions.
 */

export async function GET() {
  const sessions = await db.execute<{
    cnt: number;
    avg_events: number;
    by_source: { source: string; cnt: number }[];
  }>(sql`
    WITH s AS (
      SELECT session_id, source, count(*) as ev_count
      FROM events
      WHERE ts > now() - interval '30 days' AND session_id IS NOT NULL
      GROUP BY session_id, source
    )
    SELECT
      count(*)::int as cnt,
      coalesce(avg(ev_count), 0)::int as avg_events,
      jsonb_agg(jsonb_build_object('source', source, 'cnt', cnt) ORDER BY cnt DESC) FILTER (WHERE source IS NOT NULL) as by_source
    FROM (
      SELECT source, count(*)::int as cnt FROM s GROUP BY source
    ) t
  `);

  // Daily session counts
  const daily = await db.execute<{ d: string; sessions: number; events: number }>(sql`
    SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') as d,
           count(distinct session_id)::int as sessions,
           count(*)::int as events
    FROM events
    WHERE ts > now() - interval '14 days'
    GROUP BY date_trunc('day', ts)
    ORDER BY date_trunc('day', ts)
  `);

  return NextResponse.json({ sessions: sessions[0] ?? null, daily });
}
