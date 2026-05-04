import { db, bookings, users, events } from "@/lib/db";
import { sql, desc, eq, and, gte } from "drizzle-orm";
import { Shell } from "./_components/Shell";
import { getAdminFromCookie } from "@/lib/admin-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const day = sql`now() - interval '24 hours'`;
  const week = sql`now() - interval '7 days'`;

  const [{ count: bookingsCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings);
  const [{ count: usersCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [{ count: events24h }] = await db.select({ count: sql<number>`count(*)::int` }).from(events).where(sql`${events.ts} > ${day}`);

  const [{ revenue }] = await db.select({
    revenue: sql<number>`coalesce(sum(${bookings.priceKopecks}), 0)::int`,
  })
    .from(bookings)
    .where(and(eq(bookings.status, "completed"), gte(bookings.createdAt, sql`now() - interval '30 days'`)));

  const [{ count: bookings7d }] = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(sql`${bookings.createdAt} > ${week}`);

  // По дням (агрегация для графика)
  const daily = await db.execute<{ d: string; c: number; rev: number }>(sql`
    SELECT to_char(date_trunc('day', created_at), 'DD.MM') as d,
           count(*)::int as c,
           coalesce(sum(price_kopecks), 0)::int as rev
    FROM bookings
    WHERE created_at > now() - interval '14 days'
    GROUP BY date_trunc('day', created_at)
    ORDER BY date_trunc('day', created_at)
  `);

  const recent = await db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(8);

  return { bookingsCount, usersCount, events24h, revenue, bookings7d, daily, recent };
}

export default async function AdminDashboard() {
  const admin = await getAdminFromCookie();
  if (!admin) return null;   // middleware сделает редирект

  let stats;
  try { stats = await getStats(); } catch (e) {
    return (
      <Shell active="dashboard" adminEmail={admin.email}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 300 }}>Дашборд</h1>
        <p style={{ color: "#a54a3a", marginTop: 16 }}>
          Не подключена база. Установи <code>DATABASE_URL</code>, запусти <code>pnpm db:migrate</code>.
        </p>
        <pre style={{ background: "#fbece8", padding: 12, borderRadius: 8, fontSize: 12, marginTop: 12 }}>{(e as Error).message}</pre>
      </Shell>
    );
  }

  const maxC = Math.max(1, ...stats.daily.map(d => d.c));

  return (
    <Shell active="dashboard" adminEmail={admin.email}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 300, marginBottom: "1.5rem" }}>Дашборд</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        <Card label="Всего заказов" value={stats.bookingsCount.toLocaleString("ru")} />
        <Card label="За 7 дней" value={stats.bookings7d.toLocaleString("ru")} />
        <Card label="Клиентов" value={stats.usersCount.toLocaleString("ru")} />
        <Card label="Выручка 30д" value={`${Math.round(stats.revenue / 100).toLocaleString("ru")} ₽`} />
      </div>

      <h2 style={{ marginTop: "3rem", fontSize: "1.2rem", fontWeight: 400, marginBottom: 12 }}>Заказы по дням (14 дней)</h2>
      <div style={{ background: "#fffefa", padding: "1.5rem", borderRadius: 12, border: "1px solid #e3e0da" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140 }}>
          {stats.daily.length === 0 && <div style={{ color: "#8a8580", margin: "auto" }}>Нет данных</div>}
          {stats.daily.map((d) => (
            <div key={d.d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{
                width: "100%",
                height: `${(d.c / maxC) * 100}%`,
                minHeight: 2,
                background: "#c45d3e",
                borderRadius: "3px 3px 0 0",
                opacity: 0.85,
              }} title={`${d.d}: ${d.c} брони, ${Math.round(d.rev/100)}₽`} />
              <div style={{ fontSize: 10, color: "#8a8580" }}>{d.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "3rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 400 }}>Последние заказы</h2>
        <Link href="/admin/bookings" style={{ color: "#c45d3e", fontSize: 13 }}>Все заказы →</Link>
      </div>
      <table style={tableStyle}>
        <thead style={{ background: "#f0eee8" }}>
          <tr>
            <th style={th}>Дата</th>
            <th style={th}>Аэропорт</th>
            <th style={th}>Заезд → Выезд</th>
            <th style={th}>Цена</th>
            <th style={th}>Статус</th>
            <th style={th}>Источник</th>
          </tr>
        </thead>
        <tbody>
          {stats.recent.map((b) => (
            <tr key={b.id} style={{ borderTop: "1px solid #e3e0da" }}>
              <td style={td}>{b.createdAt.toLocaleDateString("ru")}</td>
              <td style={td}><Link href={`/admin/bookings/${b.id}`} style={linkStyle}>{b.airport}</Link></td>
              <td style={td}>{b.dateFrom.toLocaleDateString("ru")} → {b.dateTo.toLocaleDateString("ru")}</td>
              <td style={td}>{Math.round(b.priceKopecks / 100).toLocaleString("ru")} ₽</td>
              <td style={td}><StatusPill status={b.status} /></td>
              <td style={td}>{b.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#fffefa", border: "1px solid #e3e0da", borderRadius: 12, padding: "1.25rem 1.5rem" }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a8580", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "Instrument Serif, serif", fontSize: "2rem", fontWeight: 400, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const colors: Record<string, [string, string]> = {
    new:        ["#a06614", "#fdf3e3"],
    confirmed:  ["#1a6e4e", "#ecf8f1"],
    active:     ["#c45d3e", "#fdf6f3"],
    completed:  ["#1a6e4e", "#ecf8f1"],
    cancelled:  ["#a54a3a", "#fbece8"],
  };
  const [c, bg] = colors[status] ?? ["#8a8580", "#f0eee8"];
  const labels: Record<string, string> = {
    new: "Новая", confirmed: "Подтв.", active: "Активна", completed: "Завершена", cancelled: "Отменена",
  };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 100,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color: c, background: bg,
    }}>{labels[status] ?? status}</span>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fffefa", marginTop: 12, borderRadius: 12, overflow: "hidden", border: "1px solid #e3e0da" };
const th: React.CSSProperties = { padding: "0.75rem 0.9rem", textAlign: "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#8a8580", fontWeight: 500 };
const td: React.CSSProperties = { padding: "0.75rem 0.9rem", fontSize: 13 };
const linkStyle: React.CSSProperties = { color: "#c45d3e", textDecoration: "none", fontWeight: 500 };
