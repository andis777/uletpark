import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { Shell } from "../_components/Shell";
import { getAdminFromCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

async function load() {
  const funnelRows = await db.execute<{ event_name: string; cnt: number }>(sql`
    SELECT event_name, count(distinct coalesce(user_id::text, session_id))::int as cnt
    FROM events
    WHERE ts > now() - interval '30 days'
      AND event_name IN ('page_view', 'app_open', 'calc_started', 'booking_started', 'booking_created')
    GROUP BY event_name
  `);

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

  const tiers = await db.execute<{ tier: string; cnt: number }>(sql`
    SELECT loyalty_tier as tier, count(*)::int as cnt FROM users GROUP BY loyalty_tier
  `);

  return { funnelRows, byAirport, tiers };
}

export default async function AnalyticsPage() {
  const admin = await getAdminFromCookie();
  if (!admin) return null;

  let data;
  try { data = await load(); } catch (e) {
    return (
      <Shell active="analytics" adminEmail={admin.email}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 300 }}>Аналитика</h1>
        <pre style={{ background: "#fbece8", padding: 12, borderRadius: 8, fontSize: 12, color: "#a54a3a" }}>{(e as Error).message}</pre>
      </Shell>
    );
  }

  // Funnel: упорядочим в логическом порядке
  const FUNNEL_ORDER = ["page_view", "app_open", "calc_started", "booking_started", "booking_created"];
  const FUNNEL_LABEL: Record<string, string> = {
    page_view: "Просмотр сайта",
    app_open: "Запуск app",
    calc_started: "Калькулятор",
    booking_started: "Нажал «Забронировать»",
    booking_created: "Создал бронь",
  };
  const funnelMap = Object.fromEntries(data.funnelRows.map(r => [r.event_name, r.cnt]));
  const funnel = FUNNEL_ORDER.map(n => ({ name: n, label: FUNNEL_LABEL[n], cnt: funnelMap[n] ?? 0 }));
  const top = funnel[0]?.cnt ?? 1;

  return (
    <Shell active="analytics" adminEmail={admin.email}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 300, marginBottom: 8 }}>Аналитика <span style={{ color: "#8a8580", fontSize: "1rem" }}>· 30 дней</span></h1>
      <p style={{ color: "#8a8580", fontSize: 13, marginBottom: 24 }}>
        Своя метрика по событиям сайта и приложения. Чем меньше падений по воронке — тем выше итоговая конверсия.
      </p>

      {/* Funnel */}
      <div style={card}>
        <h2 style={cardTitle}>Воронка конверсии</h2>
        <div style={{ marginTop: 16 }}>
          {funnel.map((f, i) => {
            const w = top > 0 ? (f.cnt / top) * 100 : 0;
            const drop = i > 0 && funnel[i - 1].cnt > 0 ? Math.round(((funnel[i - 1].cnt - f.cnt) / funnel[i - 1].cnt) * 100) : null;
            return (
              <div key={f.name} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#0a0a0a" }}>{f.label}</span>
                  <span style={{ color: "#8a8580" }}>
                    <strong style={{ color: "#0a0a0a" }}>{f.cnt.toLocaleString("ru")}</strong>
                    {drop !== null && <span style={{ marginLeft: 12, color: drop > 50 ? "#a54a3a" : "#8a8580", fontSize: 11 }}>↓ {drop}%</span>}
                  </span>
                </div>
                <div style={{ height: 24, background: "#f0eee8", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${w}%`, background: "#c45d3e", borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* By airport */}
      <h2 style={{ fontSize: "1.2rem", fontWeight: 400, marginTop: 32, marginBottom: 12 }}>По аэропортам (30 дней)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {data.byAirport.length === 0 && <div style={{ ...card, gridColumn: "1 / -1", textAlign: "center", color: "#8a8580" }}>Нет данных за 30 дней</div>}
        {data.byAirport.map(a => {
          const conv = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;
          return (
            <div key={a.airport} style={card}>
              <div style={{ fontSize: 11, color: "#c45d3e", letterSpacing: 2, fontWeight: 600 }}>{a.airport}</div>
              <div style={{ fontFamily: "Instrument Serif, serif", fontSize: "1.8rem", fontWeight: 400, marginTop: 8 }}>
                {a.total.toLocaleString("ru")}
              </div>
              <div style={{ fontSize: 11, color: "#8a8580" }}>заказов</div>
              <div style={{ marginTop: 12, fontSize: 12 }}>
                <div>Завершено: <strong>{a.completed}</strong> ({conv}%)</div>
                <div>Выручка: <strong>{Math.round(a.revenue / 100).toLocaleString("ru")} ₽</strong></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tiers */}
      <h2 style={{ fontSize: "1.2rem", fontWeight: 400, marginTop: 32, marginBottom: 12 }}>Распределение по тирам</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {(["bronze", "silver", "gold"] as const).map(t => {
          const cnt = data.tiers.find(x => x.tier === t)?.cnt ?? 0;
          return (
            <div key={t} style={card}>
              <div style={{ fontSize: 11, color: "#c45d3e", letterSpacing: 2, fontWeight: 600, textTransform: "uppercase" }}>{t}</div>
              <div style={{ fontFamily: "Instrument Serif, serif", fontSize: "1.8rem", fontWeight: 400, marginTop: 8 }}>{cnt}</div>
              <div style={{ fontSize: 11, color: "#8a8580" }}>клиентов</div>
            </div>
          );
        })}
      </div>

      <p style={{ marginTop: 32, fontSize: 12, color: "#8a8580" }}>
        Воронка строится из таблицы <code>events</code>. Чтобы данные росли — подключи tracker.js на сайте и SDK в приложении (Phase 4).
      </p>
    </Shell>
  );
}

const card: React.CSSProperties = { background: "#fffefa", border: "1px solid #e3e0da", borderRadius: 12, padding: "1.25rem 1.5rem" };
const cardTitle: React.CSSProperties = { fontSize: "0.95rem", fontWeight: 500 };
