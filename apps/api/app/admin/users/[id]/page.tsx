import { eq, desc } from "drizzle-orm";
import { db, users, bookings, loyaltyTransactions } from "@/lib/db";
import { Shell } from "../../_components/Shell";
import { StatusPill } from "../../page";
import { getAdminFromCookie } from "@/lib/admin-auth";
import { LoyaltyAdjuster } from "./LoyaltyAdjuster";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookie();
  if (!admin) return null;
  const { id } = await params;

  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) return <Shell active="users" adminEmail={admin.email}><h1>Не найдено</h1></Shell>;

  const userBookings = await db.select().from(bookings).where(eq(bookings.userId, id)).orderBy(desc(bookings.createdAt)).limit(20);
  const txs = await db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.userId, id)).orderBy(desc(loyaltyTransactions.createdAt)).limit(20);

  const totalSpent = userBookings.filter(b => b.status === "completed").reduce((s, b) => s + b.priceKopecks, 0);

  return (
    <Shell active="users" adminEmail={admin.email}>
      <Link href="/admin/users" style={{ color: "#8a8580", fontSize: 13 }}>← Все клиенты</Link>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 300, marginTop: 12 }}>
        {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.phone}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        <div>
          <div style={card}>
            <h2 style={cardTitle}>Профиль</h2>
            <Field k="Телефон" v={u.phone} />
            <Field k="Email" v={u.email ?? "—"} />
            <Field k="Реферальный код" v={u.referralCode ?? "—"} />
            <Field k="Зарегистрирован" v={u.createdAt.toLocaleString("ru")} />
            <Field k="amoCRM contact" v={u.amocrmContactId ? String(u.amocrmContactId) : "—"} />
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <h2 style={cardTitle}>История заказов <span style={{ color: "#8a8580", fontWeight: 400 }}>· {userBookings.length}</span></h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {userBookings.length === 0 && <tr><td style={{ color: "#8a8580", padding: 12 }}>Заказов нет</td></tr>}
                {userBookings.map(b => (
                  <tr key={b.id} style={{ borderTop: "1px solid #f0eee8" }}>
                    <td style={tdCell}>{b.createdAt.toLocaleDateString("ru")}</td>
                    <td style={tdCell}><Link href={`/admin/bookings/${b.id}`} style={linkStyle}>{b.airport}</Link></td>
                    <td style={tdCell}>{Math.round(b.priceKopecks/100).toLocaleString("ru")} ₽</td>
                    <td style={tdCell}><StatusPill status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <h2 style={cardTitle}>Транзакции лояльности <span style={{ color: "#8a8580", fontWeight: 400 }}>· {txs.length}</span></h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {txs.length === 0 && <tr><td style={{ color: "#8a8580", padding: 12 }}>Транзакций нет</td></tr>}
                {txs.map(t => (
                  <tr key={t.id} style={{ borderTop: "1px solid #f0eee8" }}>
                    <td style={tdCell}>{t.createdAt.toLocaleDateString("ru")}</td>
                    <td style={tdCell}>{t.reason}</td>
                    <td style={{ ...tdCell, color: t.deltaPoints > 0 ? "#1a6e4e" : "#a54a3a", fontWeight: 600 }}>
                      {t.deltaPoints > 0 ? "+" : ""}{t.deltaPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#8a8580", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Тариф лояльности</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 600, color: "#c45d3e", letterSpacing: 4 }}>{u.loyaltyTier.toUpperCase()}</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 200, fontFamily: "Instrument Serif, serif", marginTop: 16 }}>
              {u.loyaltyPoints.toLocaleString("ru")}
            </div>
            <div style={{ fontSize: 12, color: "#8a8580" }}>баллов</div>
            <div style={{ fontSize: 12, color: "#8a8580", marginTop: 12 }}>
              Потрачено: {Math.round(totalSpent / 100).toLocaleString("ru")} ₽
            </div>
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <h2 style={cardTitle}>Корректировка баллов</h2>
            <LoyaltyAdjuster userId={u.id} currentPoints={u.loyaltyPoints} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0eee8", fontSize: 13 }}>
      <span style={{ color: "#8a8580" }}>{k}</span>
      <span style={{ fontWeight: 500 }}>{v}</span>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fffefa", border: "1px solid #e3e0da", borderRadius: 12, padding: "1.25rem 1.5rem" };
const cardTitle: React.CSSProperties = { fontSize: "0.95rem", fontWeight: 500, marginBottom: 12 };
const tdCell: React.CSSProperties = { padding: "8px 4px" };
const linkStyle: React.CSSProperties = { color: "#c45d3e", textDecoration: "none", fontWeight: 500 };
