import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, bookings, loyaltyTransactions } from "@/lib/db";
import { getCurrentClient } from "@/lib/cabinet-auth";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Личный кабинет · Улётная Парковка",
  robots: { index: false, follow: false },
};

const SITE = "https://uletnayaparkovka.ru";
// Отзывы на Яндекс.Картах — карточка организации «Улётная парковка».
// Просим отзыв у тех, кто уже съездил: отзывы двигают выдачу в картах,
// а карты по «парковка Шереметьево» стоят выше рекламы.
const YANDEX_REVIEWS = "https://yandex.ru/maps/org/ulyotnaya_parkovka/64527453581/reviews/";

const STATUS_RU: Record<string, string> = {
  new: "Новая",
  confirmed: "Подтверждена",
  active: "Машина на парковке",
  completed: "Завершена",
  cancelled: "Отменена",
};

function money(kopecks: number) {
  return `${Math.round(kopecks / 100).toLocaleString("ru-RU")} ₽`;
}
function d(date: Date) {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

/**
 * Клиент уже был на парковке? Тогда просим оценить.
 * Если бронь ещё впереди — та же карточка Яндекса, но как «почитать отзывы»:
 * просить оценку за услугу, которой ещё не было, бессмысленно.
 */
function hasStayed(status: string) {
  return status === "active" || status === "completed";
}

export default async function CabinetPage() {
  const user = await getCurrentClient();
  if (!user) redirect("/cabinet/login");

  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.userId, user.id))
    .orderBy(desc(bookings.dateFrom))
    .limit(50);

  const txs = await db
    .select()
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.userId, user.id))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(10);

  const now = new Date();
  const active = rows.filter((b) => b.dateTo >= now && b.status !== "cancelled");
  const past = rows.filter((b) => !(b.dateTo >= now && b.status !== "cancelled"));
  const spent = rows.filter((b) => b.status === "completed").reduce((s, b) => s + b.priceKopecks, 0);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Здравствуйте";

  return (
    <div style={main}>
        {/* Шапка сайта одинакова для всех страниц, поэтому «Выйти» живёт здесь. */}
        <div style={nameRow}>
          <div>
            <h1 style={h1}>{name}</h1>
            <p style={sub}>{user.email ?? user.phone}</p>
          </div>
          <LogoutButton />
        </div>

        {/* Телефон нужен для брони — просим добавить, если вошли по почте */}
        {!user.phone && (
          <div style={warn}>
            Добавьте номер телефона — по нему диспетчер подтверждает бронь и подаёт трансфер.
            Это можно сделать при следующем бронировании.
          </div>
        )}

        <section style={cards}>
          <div style={kpi}>
            <div style={kpiN}>{user.loyaltyPoints.toLocaleString("ru-RU")}</div>
            <div style={kpiL}>баллов на счету</div>
          </div>
          <div style={kpi}>
            <div style={kpiN}>{user.loyaltyTier.toUpperCase()}</div>
            <div style={kpiL}>уровень</div>
          </div>
          <div style={kpi}>
            <div style={kpiN}>{rows.length}</div>
            <div style={kpiL}>всего броней</div>
          </div>
          <div style={kpi}>
            <div style={kpiN}>{money(spent)}</div>
            <div style={kpiL}>на парковке</div>
          </div>
        </section>

        <a href={`${SITE}/sheremetevo`} style={cta}>Забронировать парковку →</a>

        <section style={card}>
          <h2 style={cardTitle}>Активные брони</h2>
          {active.length === 0 ? (
            <p style={empty}>Активных броней нет. <a href={`${SITE}/sheremetevo`} style={link}>Забронировать</a></p>
          ) : (
            active.map((b) => (
              <div key={b.id} style={row}>
                <div>
                  <div style={rowTitle}>{d(b.dateFrom)} — {d(b.dateTo)}</div>
                  <div style={rowSub}>
                    {b.airport}{b.carNumber ? ` · ${b.carNumber}` : ""} · {STATUS_RU[b.status] ?? b.status}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={rowPrice}>{money(b.priceKopecks)}</div>
                  <a href={YANDEX_REVIEWS} target="_blank" rel="noopener" style={review}>
                    {hasStayed(b.status) ? "★ Оценить на Яндексе" : "★ Отзывы на Яндексе"}
                  </a>
                </div>
              </div>
            ))
          )}
        </section>

        <section style={card}>
          <h2 style={cardTitle}>История</h2>
          {past.length === 0 ? (
            <p style={empty}>Пока пусто.</p>
          ) : (
            past.slice(0, 20).map((b) => (
              <div key={b.id} style={row}>
                <div>
                  <div style={rowTitle}>{d(b.dateFrom)} — {d(b.dateTo)}</div>
                  <div style={rowSub}>
                    {b.airport}{b.carNumber ? ` · ${b.carNumber}` : ""} · {STATUS_RU[b.status] ?? b.status}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={rowPrice}>{money(b.priceKopecks)}</div>
                  <a href={`${SITE}/sheremetevo`} style={repeat}>Повторить</a>
                  <a href={YANDEX_REVIEWS} target="_blank" rel="noopener" style={review}>
                    {hasStayed(b.status) ? "★ Оценить на Яндексе" : "★ Отзывы на Яндексе"}
                  </a>
                </div>
              </div>
            ))
          )}
        </section>

        {txs.length > 0 && (
          <section style={card}>
            <h2 style={cardTitle}>Баллы</h2>
            {txs.map((t) => (
              <div key={t.id} style={row}>
                <div>
                  <div style={rowTitle}>{t.reason}</div>
                  <div style={rowSub}>{t.createdAt.toLocaleDateString("ru-RU")}</div>
                </div>
                <div style={{ ...rowPrice, color: t.deltaPoints >= 0 ? "#2f7a44" : "#b03a2e" }}>
                  {t.deltaPoints >= 0 ? "+" : ""}{t.deltaPoints}
                </div>
              </div>
            ))}
          </section>
        )}

        {user.referralCode && (
          <section style={card}>
            <h2 style={cardTitle}>Приведите друга</h2>
            <p style={empty}>Ваш код: <b style={{ color: "#0f3b5d", letterSpacing: 1 }}>{user.referralCode}</b></p>
          </section>
        )}

    </div>
  );
}

// Шапка и подвал — в общем layout.tsx кабинета; здесь только содержимое страницы.
const main: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "24px 16px 48px" };
const nameRow: React.CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 };
const h1: React.CSSProperties = { fontSize: 26, fontWeight: 700, margin: "0 0 4px" };
const sub: React.CSSProperties = { fontSize: 14, color: "#5c6b76", margin: 0 };
const warn: React.CSSProperties = { background: "#fdf5ef", border: "1px solid #f3ddc9", borderRadius: 12, padding: "12px 14px", fontSize: 13.5, color: "#8a5a2b", marginBottom: 18, lineHeight: 1.5 };
const cards: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 };
const kpi: React.CSSProperties = { background: "#fff", border: "1px solid #e3ecee", borderRadius: 12, padding: "14px 16px", textAlign: "center" };
const kpiN: React.CSSProperties = { fontSize: 21, fontWeight: 800, color: "#0f3b5d" };
const kpiL: React.CSSProperties = { fontSize: 11.5, color: "#5c6b76", marginTop: 4 };
const cta: React.CSSProperties = { display: "block", textAlign: "center", background: "#86a82a", color: "#fff", padding: "14px 18px", borderRadius: 12, fontWeight: 700, textDecoration: "none", marginBottom: 20 };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3ecee", borderRadius: 14, padding: "16px 18px", marginBottom: 14 };
const cardTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, margin: "0 0 10px", color: "#0f3b5d" };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f0f4f5" };
const rowTitle: React.CSSProperties = { fontSize: 14, fontWeight: 600 };
const rowSub: React.CSSProperties = { fontSize: 12.5, color: "#8a97a1", marginTop: 2 };
const rowPrice: React.CSSProperties = { fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" };
const repeat: React.CSSProperties = { fontSize: 12, color: "#1a8f86", textDecoration: "none", display: "block", marginTop: 3 };
const review: React.CSSProperties = { fontSize: 12, color: "#c98a00", textDecoration: "none", display: "block", marginTop: 3, whiteSpace: "nowrap" };
const empty: React.CSSProperties = { fontSize: 13.5, color: "#8a97a1", margin: 0 };
const link: React.CSSProperties = { color: "#1a8f86", textDecoration: "none" };
