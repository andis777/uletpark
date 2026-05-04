/**
 * Дополнительные materialized views и индексы для аналитики (Phase 4).
 * Запуск: pnpm --filter @uletnaya/db tsx scripts/migrate-analytics-views.ts
 *
 * Идемпотентно: используем CREATE OR REPLACE / IF NOT EXISTS.
 */

import { sql } from "drizzle-orm";
import { db } from "../index.js";

async function main() {
  console.log("→ Создаю analytics views и индексы...");

  // Brin-индекс по ts даёт быстрый сканирование по времени за копейки места
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS events_ts_brin ON events USING brin (ts);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS events_user_event_ts ON events (user_id, event_name, ts DESC);
  `);

  // Materialized view: первая активность пользователя — для cohort retention
  await db.execute(sql`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_first_seen AS
    SELECT user_id,
           min(ts) as first_ts,
           to_char(date_trunc('week', min(ts)), 'YYYY-"W"WW') as cohort_week,
           to_char(date_trunc('month', min(ts)), 'YYYY-MM') as cohort_month
    FROM events
    WHERE user_id IS NOT NULL
    GROUP BY user_id;
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS mv_user_first_seen_pk ON mv_user_first_seen (user_id);
  `);

  // Materialized view: дневная активность — для rolling DAU/WAU/MAU
  await db.execute(sql`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_active AS
    SELECT date_trunc('day', ts) as day,
           count(distinct user_id)::int as dau,
           count(distinct session_id)::int as sessions,
           count(*)::int as events
    FROM events
    WHERE ts > now() - interval '90 days'
    GROUP BY date_trunc('day', ts);
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_active_pk ON mv_daily_active (day);
  `);

  console.log("✓ Готово.");
  console.log("  Чтобы освежить materialized views — запусти периодически:");
  console.log("    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_first_seen;");
  console.log("    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_active;");
  console.log("  (или через Vercel Cron — см. apps/api/app/api/cron/refresh-analytics)");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
