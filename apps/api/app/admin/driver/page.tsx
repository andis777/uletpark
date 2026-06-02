import { db, bookings, users } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { and, gte, lte, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DatePicker } from "./DatePicker";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export const dynamic = "force-dynamic";

export default async function DriverDashboard({ searchParams }: PageProps) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const dateStr = sp.date ?? today;
  const date = new Date(dateStr + "T00:00:00Z");
  const dayEnd = new Date(date.getTime() + 86_400_000);

  // Заезды на день
  const pickupsRaw = await db
    .select()
    .from(bookings)
    .where(and(
      gte(bookings.dateFrom, date),
      lte(bookings.dateFrom, dayEnd),
      inArray(bookings.status, ["new", "confirmed", "active"]),
    ))
    .orderBy(bookings.dateFrom);

  // Выезды на день
  const dropoffsRaw = await db
    .select()
    .from(bookings)
    .where(and(
      gte(bookings.dateTo, date),
      lte(bookings.dateTo, dayEnd),
      inArray(bookings.status, ["confirmed", "active"]),
    ))
    .orderBy(bookings.dateTo);

  const userIds = Array.from(new Set([
    ...pickupsRaw.map(p => p.userId),
    ...dropoffsRaw.map(p => p.userId),
  ].filter(Boolean) as string[]));

  const usersMap = new Map<string, { name: string; phone: string }>();
  if (userIds.length > 0) {
    const rows = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone })
      .from(users)
      .where(inArray(users.id, userIds));
    for (const u of rows) {
      usersMap.set(u.id, {
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "Гость",
        phone: u.phone,
      });
    }
  }

  const yesterday = new Date(date.getTime() - 86_400_000).toISOString().slice(0, 10);
  const tomorrow = new Date(date.getTime() + 86_400_000).toISOString().slice(0, 10);

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--primary)", fontWeight: 700, marginBottom: 4 }}>
            🚐 ДИСПЕТЧЕРСКАЯ
          </div>
          <h1 style={{ margin: 0, fontSize: 28 }}>
            Трансферы на {dateStr === today ? "сегодня" : new Date(dateStr).toLocaleDateString("ru")}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/admin/driver?date=${yesterday}`} style={btnSec}>← Вчера</a>
          <a href={`/admin/driver?date=${today}`} style={btnSec}>Сегодня</a>
          <a href={`/admin/driver?date=${tomorrow}`} style={btnSec}>Завтра →</a>
          <DatePicker initial={dateStr} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Заезды */}
        <section>
          <div style={{
            background: "linear-gradient(135deg,#3FB8AF,#2a8a83)", color: "#fff",
            padding: "20px 24px", borderRadius: "12px 12px 0 0",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.9, letterSpacing: 2 }}>ЗАЕЗДЫ</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>Привезти на парковку</div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.2)", padding: "6px 14px",
              borderRadius: 100, fontWeight: 700,
            }}>{pickupsRaw.length}</div>
          </div>
          <div style={{ background: "#fff", padding: 0, borderRadius: "0 0 12px 12px", boxShadow: "0 4px 16px rgba(15,77,71,0.08)" }}>
            {pickupsRaw.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a8f9f" }}>На этот день заездов нет</div>
            ) : (
              pickupsRaw.map(b => {
                const client = b.userId ? usersMap.get(b.userId) : null;
                return (
                  <div key={b.id} style={{
                    padding: 16, borderBottom: "1px solid #e5e7eb",
                    display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                  }}>
                    <div style={{
                      background: pillBg(b.status), color: pillFg(b.status),
                      padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                    }}>{statusLabel(b.status)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {client?.name ?? "Гость"} · <a href={`tel:${client?.phone ?? ""}`} style={{ color: "#0f4d47" }}>{client?.phone ?? "—"}</a>
                      </div>
                      <div style={{ fontSize: 13, color: "#4b5161", marginTop: 4 }}>
                        🚗 {b.carNumber || "—"} {b.carModel ? `· ${b.carModel}` : ""}
                      </div>
                      <div style={{ fontSize: 12, color: "#8a8f9f", marginTop: 2 }}>
                        {b.airport} · до {new Date(b.dateTo).toLocaleDateString("ru")} · {b.priceRub} ₽
                      </div>
                    </div>
                    <a href={`/admin/bookings/${b.id}`} style={btnSecSm}>→</a>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Выезды */}
        <section>
          <div style={{
            background: "linear-gradient(135deg,#1a3a35,#0f4d47)", color: "#fff",
            padding: "20px 24px", borderRadius: "12px 12px 0 0",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.9, letterSpacing: 2 }}>ВЫЕЗДЫ</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>Встретить из терминала</div>
            </div>
            <div style={{
              background: "rgba(255,255,255,0.2)", padding: "6px 14px",
              borderRadius: 100, fontWeight: 700,
            }}>{dropoffsRaw.length}</div>
          </div>
          <div style={{ background: "#fff", padding: 0, borderRadius: "0 0 12px 12px", boxShadow: "0 4px 16px rgba(15,77,71,0.08)" }}>
            {dropoffsRaw.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#8a8f9f" }}>На этот день выездов нет</div>
            ) : (
              dropoffsRaw.map(b => {
                const client = b.userId ? usersMap.get(b.userId) : null;
                return (
                  <div key={b.id} style={{
                    padding: 16, borderBottom: "1px solid #e5e7eb",
                    display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center",
                  }}>
                    <div style={{
                      background: pillBg(b.status), color: pillFg(b.status),
                      padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                    }}>{statusLabel(b.status)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {client?.name ?? "Гость"} · <a href={`tel:${client?.phone ?? ""}`} style={{ color: "#0f4d47" }}>{client?.phone ?? "—"}</a>
                      </div>
                      <div style={{ fontSize: 13, color: "#4b5161", marginTop: 4 }}>
                        🚗 {b.carNumber || "—"} {b.carModel ? `· ${b.carModel}` : ""}
                      </div>
                      <div style={{ fontSize: 12, color: "#8a8f9f", marginTop: 2 }}>
                        {b.airport} · с {new Date(b.dateFrom).toLocaleDateString("ru")}
                      </div>
                    </div>
                    <a href={`/admin/bookings/${b.id}`} style={btnSecSm}>→</a>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div style={{ marginTop: 32, padding: 20, background: "#f6f8f8", borderRadius: 12, fontSize: 13, color: "#4b5161" }}>
        <strong>Подсказки:</strong>
        <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
          <li>Клиент звонит сам за 30 минут до выезда из терминала — водитель выезжает встречать</li>
          <li>При заезде клиент звонит водителю — встречаем и везём к терминалу</li>
          <li>Время трансфера: 7–14 минут до Шереметьево (с учётом светофоров)</li>
          <li>Жми «→» рядом с бронью чтобы перейти в её карточку и поменять статус</li>
        </ul>
      </div>
    </main>
  );
}

function statusLabel(s: string): string {
  return ({ new: "Новая", confirmed: "Подтв.", active: "Активна", completed: "Завершена", cancelled: "Отмена" } as Record<string, string>)[s] ?? s;
}
function pillBg(s: string): string {
  if (s === "confirmed") return "rgba(63,184,175,0.12)";
  if (s === "active") return "rgba(217,148,65,0.12)";
  if (s === "completed") return "#ecf8f1";
  if (s === "cancelled") return "#fef2f2";
  return "#f4f5f7";
}
function pillFg(s: string): string {
  if (s === "confirmed") return "#0f4d47";
  if (s === "active") return "#d99441";
  if (s === "completed") return "#1a6e4e";
  if (s === "cancelled") return "#991b1b";
  return "#4b5161";
}

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

const btnSecSm = {
  ...btnSec,
  padding: "6px 12px",
  fontSize: 16,
};
