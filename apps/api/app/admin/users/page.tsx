import { sql, desc, like, or } from "drizzle-orm";
import { db, users, bookings } from "@/lib/db";
import { Shell } from "../_components/Shell";
import { Filters } from "../_components/Filters";
import { getAdminFromCookie } from "@/lib/admin-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const admin = await getAdminFromCookie();
  if (!admin) return null;

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const limit = 30;

  const where = sp.q ? or(
    like(users.phone, `%${sp.q}%`),
    like(users.firstName, `%${sp.q}%`),
    like(users.lastName, `%${sp.q}%`),
    like(users.email, `%${sp.q}%`),
    like(users.referralCode, `%${sp.q.toUpperCase()}%`),
  ) : undefined;

  const rows = await db
    .select({
      id: users.id, phone: users.phone, firstName: users.firstName,
      lastName: users.lastName, email: users.email,
      tier: users.loyaltyTier, points: users.loyaltyPoints,
      createdAt: users.createdAt, amocrmContactId: users.amocrmContactId,
      bookingsCount: sql<number>`(select count(*)::int from ${bookings} where ${bookings.userId} = ${users.id})`,
      totalSpent: sql<number>`(select coalesce(sum(${bookings.priceKopecks}), 0)::int from ${bookings} where ${bookings.userId} = ${users.id} and ${bookings.status} = 'completed')`,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users).where(where);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Shell active="users" adminEmail={admin.email}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 300, marginBottom: 16 }}>Клиенты <span style={{ color: "#8a8580", fontSize: "1rem" }}>· {total}</span></h1>
      <Filters />

      <table style={tableStyle}>
        <thead style={{ background: "#f0eee8" }}>
          <tr>
            <th style={th}>Телефон</th>
            <th style={th}>Имя</th>
            <th style={th}>Email</th>
            <th style={th}>Тариф</th>
            <th style={th}>Баллов</th>
            <th style={th}>Заказов</th>
            <th style={th}>Потрачено</th>
            <th style={th}>Регистрация</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "#8a8580" }}>Ничего не найдено</td></tr>}
          {rows.map(u => (
            <tr key={u.id} style={{ borderTop: "1px solid #e3e0da" }}>
              <td style={td}><Link href={`/admin/users/${u.id}`} style={linkStyle}>{u.phone}</Link></td>
              <td style={td}>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</td>
              <td style={{ ...td, color: "#8a8580" }}>{u.email ?? "—"}</td>
              <td style={td}><TierPill tier={u.tier} /></td>
              <td style={td}>{u.points.toLocaleString("ru")}</td>
              <td style={td}>{u.bookingsCount}</td>
              <td style={td}>{Math.round(u.totalSpent / 100).toLocaleString("ru")} ₽</td>
              <td style={{ ...td, color: "#8a8580", fontSize: 12 }}>{u.createdAt.toLocaleDateString("ru")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map(p => {
            const np = new URLSearchParams(sp as Record<string, string>);
            np.set("page", String(p));
            return (
              <Link key={p} href={`?${np.toString()}`} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 13,
                background: page === p ? "#c45d3e" : "#fffefa",
                color: page === p ? "white" : "#0a0a0a",
                border: "1px solid #e3e0da", textDecoration: "none",
              }}>{p}</Link>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function TierPill({ tier }: { tier: string }) {
  const colors: Record<string, [string, string]> = {
    bronze: ["#a06614", "#fdf3e3"],
    silver: ["#5a5d65", "#e8e9eb"],
    gold:   ["#a06614", "#fef3c7"],
  };
  const [c, bg] = colors[tier] ?? ["#8a8580", "#f0eee8"];
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 600, color: c, background: bg, textTransform: "uppercase", letterSpacing: 1 }}>
      {tier}
    </span>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fffefa", borderRadius: 12, overflow: "hidden", border: "1px solid #e3e0da" };
const th: React.CSSProperties = { padding: "0.75rem 0.9rem", textAlign: "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#8a8580", fontWeight: 500 };
const td: React.CSSProperties = { padding: "0.75rem 0.9rem", fontSize: 13 };
const linkStyle: React.CSSProperties = { color: "#c45d3e", textDecoration: "none", fontWeight: 500 };
