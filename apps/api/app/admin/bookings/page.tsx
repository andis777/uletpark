import { sql, desc, and, eq, like, or, gte, lte } from "drizzle-orm";
import { db, bookings, users } from "@/lib/db";
import { Shell } from "../_components/Shell";
import { Filters } from "../_components/Filters";
import { StatusPill } from "../page";
import { getAdminFromCookie } from "@/lib/admin-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Search { q?: string; status?: string; airport?: string; page?: string; }

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const admin = await getAdminFromCookie();
  if (!admin) return null;

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const limit = 30;

  const conds = [];
  if (sp.q) conds.push(or(
    like(bookings.carNumber, `%${sp.q.toUpperCase()}%`),
    like(bookings.carModel, `%${sp.q}%`),
    like(users.phone, `%${sp.q}%`),
    like(users.firstName, `%${sp.q}%`),
    like(bookings.phone, `%${sp.q}%`),
    like(bookings.name, `%${sp.q}%`),
  ));
  if (sp.status) conds.push(eq(bookings.status, sp.status as "new"));
  if (sp.airport) conds.push(eq(bookings.airport, sp.airport as "SVO"));
  const where = conds.length > 0 ? and(...conds) : undefined;

  const rows = await db
    .select({
      id: bookings.id, airport: bookings.airport,
      dateFrom: bookings.dateFrom, dateTo: bookings.dateTo,
      priceKopecks: bookings.priceKopecks, status: bookings.status,
      carNumber: bookings.carNumber, source: bookings.source,
      createdAt: bookings.createdAt, amocrmLeadId: bookings.amocrmLeadId,
      leadName: bookings.name, leadPhone: bookings.phone,
      userPhone: users.phone, userFirstName: users.firstName, userId: users.id,
    })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(where)
    .orderBy(desc(bookings.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(where);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const exportUrl = `/api/admin/export/bookings?${new URLSearchParams(sp as Record<string, string>).toString()}`;

  return (
    <Shell active="bookings" adminEmail={admin.email}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 300 }}>Заказы <span style={{ color: "#8a8580", fontSize: "1rem" }}>· {total}</span></h1>
        <a href={exportUrl} style={{ ...btn }}>↓ Excel</a>
      </div>

      <Filters />

      <table style={tableStyle}>
        <thead style={{ background: "#f0eee8" }}>
          <tr>
            <th style={th}>Создано</th>
            <th style={th}>Клиент</th>
            <th style={th}>Аэропорт</th>
            <th style={th}>Заезд → Выезд</th>
            <th style={th}>Цена</th>
            <th style={th}>Статус</th>
            <th style={th}>Источник</th>
            <th style={th}>amoCRM</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "#8a8580" }}>Ничего не найдено</td></tr>
          )}
          {rows.map(r => (
            <tr key={r.id} style={{ borderTop: "1px solid #e3e0da" }}>
              <td style={td}>{r.createdAt.toLocaleDateString("ru")}</td>
              <td style={td}>
                {r.userId ? (
                  <Link href={`/admin/users/${r.userId}`} style={linkStyle}>
                    {r.userFirstName ?? "—"} <span style={{ color: "#8a8580" }}>{r.userPhone ?? ""}</span>
                  </Link>
                ) : (
                  <span>{r.leadName ?? "—"} <span style={{ color: "#8a8580" }}>{r.leadPhone ?? ""}</span></span>
                )}
              </td>
              <td style={td}><Link href={`/admin/bookings/${r.id}`} style={linkStyle}>{r.airport}</Link></td>
              <td style={td}>{r.dateFrom.toLocaleDateString("ru")} → {r.dateTo.toLocaleDateString("ru")}</td>
              <td style={td}>{Math.round(r.priceKopecks / 100).toLocaleString("ru")} ₽</td>
              <td style={td}><StatusPill status={r.status} /></td>
              <td style={{ ...td, color: "#8a8580", fontSize: 12 }}>{r.source}</td>
              <td style={{ ...td, fontFamily: "monospace", fontSize: 11, color: "#8a8580" }}>{r.amocrmLeadId ?? "—"}</td>
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
              <Link
                key={p}
                href={`?${np.toString()}`}
                style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 13,
                  background: page === p ? "#c45d3e" : "#fffefa",
                  color: page === p ? "white" : "#0a0a0a",
                  border: "1px solid #e3e0da", textDecoration: "none",
                }}
              >{p}</Link>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fffefa", borderRadius: 12, overflow: "hidden", border: "1px solid #e3e0da" };
const th: React.CSSProperties = { padding: "0.75rem 0.9rem", textAlign: "left", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "#8a8580", fontWeight: 500 };
const td: React.CSSProperties = { padding: "0.75rem 0.9rem", fontSize: 13 };
const linkStyle: React.CSSProperties = { color: "#c45d3e", textDecoration: "none", fontWeight: 500 };
const btn: React.CSSProperties = { padding: "8px 14px", background: "#fffefa", border: "1px solid #d6d2cc", borderRadius: 8, fontSize: 13, color: "#0a0a0a", textDecoration: "none" };
