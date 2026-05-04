import { db, syncRuns, bookings } from "@/lib/db";
import { sql, desc, isNull, isNotNull } from "drizzle-orm";
import { Shell } from "../_components/Shell";
import { getAdminFromCookie } from "@/lib/admin-auth";
import { amocrmInfo } from "@/lib/amocrm";
import { SyncTrigger } from "./SyncTrigger";

export const dynamic = "force-dynamic";

async function load() {
  const recent = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(10);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(bookings);
  const [{ fromAmo }] = await db.select({ fromAmo: sql<number>`count(*)::int` })
    .from(bookings)
    .where(isNotNull(bookings.amocrmLeadId));
  const [{ orphans }] = await db.select({ orphans: sql<number>`count(*)::int` })
    .from(bookings)
    .where(sql`${bookings.userId} IS NULL AND ${bookings.amocrmLeadId} IS NOT NULL`);

  return { recent, total, fromAmo, orphans };
}

export default async function SyncPage() {
  const admin = await getAdminFromCookie();
  if (!admin) return null;

  let data;
  try { data = await load(); } catch (e) {
    return (
      <Shell active="sync" adminEmail={admin.email}>
        <h1>Sync</h1>
        <pre style={{ background: "#fbece8", color: "#a54a3a", padding: 12, borderRadius: 8 }}>{(e as Error).message}</pre>
      </Shell>
    );
  }

  return (
    <Shell active="sync" adminEmail={admin.email}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 300, marginBottom: 8 }}>Синхронизация amoCRM</h1>
      <p style={{ color: "#8a8580", fontSize: 14, marginBottom: 24 }}>
        Импорт сделок из воронки «Улётная парковка» в нашу БД.
        Авто-привязка к клиентам по совпадению телефона.
      </p>

      {/* Status banner */}
      <div style={{
        background: amocrmInfo.isStub ? "#fdf3e3" : "#ecf8f1",
        border: `1px solid ${amocrmInfo.isStub ? "#a06614" : "#1a6e4e"}`,
        color: amocrmInfo.isStub ? "#a06614" : "#1a6e4e",
        padding: "12px 16px",
        borderRadius: 10,
        marginBottom: 24,
        fontSize: 13,
      }}>
        {amocrmInfo.isStub
          ? <>⚠ Режим STUB — реальный amoCRM не подключён. Заполни в env <code>AMOCRM_DOMAIN</code>, <code>AMOCRM_CLIENT_ID</code>, <code>AMOCRM_CLIENT_SECRET</code>, <code>AMOCRM_REFRESH_TOKEN</code>.</>
          : <>✓ amoCRM подключён: <strong>{amocrmInfo.domain}</strong></>
        }
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <Card label="Всего заказов в БД" value={data.total} />
        <Card label="Импортировано из amoCRM" value={data.fromAmo} />
        <Card label="Сирот (без юзера)" value={data.orphans} highlight={data.orphans > 0} />
      </div>

      <div style={card}>
        <h2 style={cardTitle}>Запустить синхронизацию</h2>
        <SyncTrigger />
      </div>

      <h2 style={{ fontSize: "1.2rem", fontWeight: 400, marginTop: 32, marginBottom: 12 }}>История синков</h2>
      <table style={tableStyle}>
        <thead style={{ background: "#f0eee8" }}>
          <tr>
            <th style={th}>Запущено</th>
            <th style={th}>Тип</th>
            <th style={th}>Кем</th>
            <th style={th}>Статус</th>
            <th style={th}>Получено</th>
            <th style={th}>+ Новые</th>
            <th style={th}>~ Обновл.</th>
            <th style={th}>→ К юзеру</th>
            <th style={th}>Длит.</th>
          </tr>
        </thead>
        <tbody>
          {data.recent.length === 0 && <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "#8a8580" }}>Синки ещё не запускались</td></tr>}
          {data.recent.map(r => {
            const dur = r.finishedAt ? Math.round((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000) : null;
            const errors = (r.errors as string[] | null) ?? [];
            return (
              <tr key={r.id} style={{ borderTop: "1px solid #e3e0da" }}>
                <td style={td}>{r.startedAt.toLocaleString("ru")}</td>
                <td style={{ ...td, fontSize: 11, color: "#8a8580" }}>{r.kind}</td>
                <td style={td}>{r.triggeredBy ?? "—"}</td>
                <td style={td}><StatusPill status={r.status} errors={errors.length} /></td>
                <td style={td}>{r.fetched}</td>
                <td style={{ ...td, color: r.inserted > 0 ? "#1a6e4e" : undefined }}>+{r.inserted}</td>
                <td style={td}>~{r.updated}</td>
                <td style={td}>{r.linkedToUsers}</td>
                <td style={{ ...td, color: "#8a8580", fontSize: 12 }}>{dur ? `${dur}с` : "..."}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <details style={{ marginTop: 24, fontSize: 12, color: "#8a8580" }}>
        <summary style={{ cursor: "pointer" }}>Альтернатива: запуск из CLI</summary>
        <pre style={{ background: "#fffefa", padding: 12, borderRadius: 8, marginTop: 8 }}>{`# Backfill всех сделок из воронки (за всё время):
PIPELINE="Улётная парковка" pnpm amocrm:backfill

# Только обновлённые после даты:
PIPELINE="Улётная парковка" SINCE=2025-01-01 pnpm amocrm:backfill`}</pre>
      </details>
    </Shell>
  );
}

function Card({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ ...card, background: highlight ? "#fdf6f3" : "#fffefa" }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a8580", marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "Instrument Serif, serif", fontSize: "2rem", fontWeight: 400, lineHeight: 1, color: highlight ? "#c45d3e" : undefined }}>{value}</div>
    </div>
  );
}

function StatusPill({ status, errors }: { status: string; errors: number }) {
  const colors: Record<string, [string, string]> = {
    running:   ["#a06614", "#fdf3e3"],
    success:   ["#1a6e4e", "#ecf8f1"],
    error:     ["#a54a3a", "#fbece8"],
  };
  const [c, bg] = colors[status] ?? ["#8a8580", "#f0eee8"];
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, color: c, background: bg }}>
      {status}{errors > 0 && ` · ${errors} ошибок`}
    </span>
  );
}

const card: React.CSSProperties = { background: "#fffefa", border: "1px solid #e3e0da", borderRadius: 12, padding: "1.25rem 1.5rem" };
const cardTitle: React.CSSProperties = { fontSize: "0.95rem", fontWeight: 500, marginBottom: 12 };
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fffefa", borderRadius: 12, overflow: "hidden", border: "1px solid #e3e0da", fontSize: 13 };
const th: React.CSSProperties = { padding: "0.75rem 0.9rem", textAlign: "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#8a8580", fontWeight: 500 };
const td: React.CSSProperties = { padding: "0.75rem 0.9rem", fontSize: 13 };
