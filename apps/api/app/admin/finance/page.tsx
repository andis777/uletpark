import { db, bookings } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { and, gte, lte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export const dynamic = "force-dynamic";

export default async function FinanceDashboard({ searchParams }: PageProps) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const sp = await searchParams;
  const now = new Date();
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthStr = sp.month ?? defaultMonth;
  const [yr, mo] = monthStr.split("-").map(Number);
  const monthStart = new Date(Date.UTC(yr, mo - 1, 1));
  const monthEnd = new Date(Date.UTC(yr, mo, 1));

  // Все брони с заездом в этот месяц
  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      priceRub: bookings.priceRub,
      dateFrom: bookings.dateFrom,
      dateTo: bookings.dateTo,
      source: bookings.source,
      service: bookings.service,
    })
    .from(bookings)
    .where(and(
      gte(bookings.dateFrom, monthStart),
      lte(bookings.dateFrom, monthEnd),
    ));

  // Метрики
  const totalCount = rows.length;
  const cancelledCount = rows.filter(r => r.status === "cancelled").length;
  const completedCount = rows.filter(r => r.status === "completed").length;
  const activeCount = rows.filter(r => ["new", "confirmed", "active"].includes(r.status)).length;

  const grossRub = rows.filter(r => r.status !== "cancelled").reduce((s, r) => s + (r.priceRub ?? 0), 0);
  const completedRub = rows.filter(r => r.status === "completed").reduce((s, r) => s + (r.priceRub ?? 0), 0);
  const avgCheck = totalCount > 0 ? Math.round(grossRub / Math.max(1, totalCount - cancelledCount)) : 0;
  const cancelRate = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0;

  // Группировка по дням
  const byDay = new Map<string, { count: number; sum: number }>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    const day = new Date(r.dateFrom).toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { count: 0, sum: 0 };
    cur.count += 1;
    cur.sum += r.priceRub ?? 0;
    byDay.set(day, cur);
  }
  const days = Array.from(byDay.entries()).sort();

  // Группировка по источнику
  const bySource = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    bySource.set(r.source ?? "unknown", (bySource.get(r.source ?? "unknown") ?? 0) + (r.priceRub ?? 0));
  }

  const maxDaySum = Math.max(1, ...days.map(([, v]) => v.sum));

  // Навигация
  const prevMonth = new Date(Date.UTC(yr, mo - 2, 1));
  const nextMonth = new Date(Date.UTC(yr, mo, 1));
  const prevStr = `${prevMonth.getUTCFullYear()}-${String(prevMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const nextStr = `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--primary)", fontWeight: 700, marginBottom: 4 }}>
            💰 ФИНАНСЫ
          </div>
          <h1 style={{ margin: 0, fontSize: 28 }}>
            {new Date(monthStart).toLocaleDateString("ru", { month: "long", year: "numeric", timeZone: "UTC" })}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/admin/finance?month=${prevStr}`} style={btnSec}>← Пред. месяц</a>
          <a href={`/admin/finance?month=${defaultMonth}`} style={btnSec}>Текущий</a>
          <a href={`/admin/finance?month=${nextStr}`} style={btnSec}>След. месяц →</a>
          <a href={`/api/admin/export/bookings?from=${monthStart.toISOString()}&to=${monthEnd.toISOString()}`} style={{ ...btnSec, background: "var(--primary)", color: "#fff" }}>
            📥 Excel экспорт
          </a>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Выручка валовая", value: `${grossRub.toLocaleString("ru")} ₽`, sub: "по активным+завершённым", color: "#0f4d47" },
          { label: "Выручка реализованная", value: `${completedRub.toLocaleString("ru")} ₽`, sub: "только completed", color: "#1a6e4e" },
          { label: "Средний чек", value: `${avgCheck.toLocaleString("ru")} ₽`, sub: "без учёта отмен", color: "#3FB8AF" },
          { label: "Отмены", value: `${cancelRate}%`, sub: `${cancelledCount} из ${totalCount}`, color: "#c44569" },
        ].map((k, i) => (
          <div key={i} style={kpiCard}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#8a8f9f", fontWeight: 700, textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: 30, fontWeight: 300, marginTop: 8, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#8a8f9f", marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Выручка по дням */}
        <section style={card}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Выручка по дням</h3>
          {days.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#8a8f9f" }}>Нет данных за этот месяц</div>
          ) : (
            <div style={{ display: "grid", gap: 4 }}>
              {days.map(([day, v]) => (
                <div key={day} style={{ display: "grid", gridTemplateColumns: "100px 1fr 100px 60px", gap: 12, alignItems: "center", fontSize: 13 }}>
                  <div style={{ color: "#8a8f9f" }}>{new Date(day).toLocaleDateString("ru", { day: "numeric", month: "short" })}</div>
                  <div style={{ background: "#f4f5f7", borderRadius: 4, overflow: "hidden", height: 22 }}>
                    <div style={{
                      width: `${(v.sum / maxDaySum) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#3FB8AF,#0f4d47)",
                    }} />
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, fontFamily: "monospace" }}>{v.sum.toLocaleString("ru")} ₽</div>
                  <div style={{ color: "#8a8f9f", textAlign: "right" }}>{v.count} шт</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* По источникам */}
        <section style={card}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>По источникам</h3>
          {Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]).map(([src, sum]) => (
            <div key={src} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e5e7eb", fontSize: 13 }}>
              <div>{labelSource(src)}</div>
              <div style={{ fontWeight: 700, color: "#0f4d47" }}>{sum.toLocaleString("ru")} ₽</div>
            </div>
          ))}
          {bySource.size === 0 && <div style={{ padding: 20, textAlign: "center", color: "#8a8f9f" }}>—</div>}
        </section>
      </div>

      {/* Сводная таблица */}
      <section style={{ ...card, marginTop: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Статусы броней</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { l: "Активные", c: activeCount, color: "#3FB8AF" },
            { l: "Завершённые", c: completedCount, color: "#1a6e4e" },
            { l: "Отменённые", c: cancelledCount, color: "#c44569" },
            { l: "Всего", c: totalCount, color: "#1a1d24" },
          ].map((s, i) => (
            <div key={i} style={{ padding: 16, background: "#fafbfc", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#8a8f9f", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{s.l}</div>
              <div style={{ fontSize: 26, fontWeight: 300, marginTop: 6, color: s.color }}>{s.c}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 24, padding: 16, background: "#f6f8f8", borderRadius: 8, fontSize: 12, color: "#8a8f9f" }}>
        💡 «Выручка валовая» — все брони кроме отменённых, по дате заезда.
        «Реализованная» — только завершённые. Excel-экспорт — полная выгрузка для 1С.
      </div>
    </main>
  );
}

function labelSource(s: string): string {
  return ({
    "web-landing": "🌐 Сайт (виджет)",
    "wp-landing": "🌐 WordPress",
    "b2b-landing": "💼 B2B заявки",
    "mobile-app": "📱 Приложение",
    "amocrm": "📞 Менеджер (amoCRM)",
    "phone": "📞 Звонок",
    "unknown": "❓ Неизвестно",
  } as Record<string, string>)[s] ?? s;
}

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 4px 16px rgba(15,77,71,0.08)",
};
const kpiCard = card;
const btnSec = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: 8,
  background: "#f4f5f7",
  color: "#1a1d24",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};
