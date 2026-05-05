import { eq } from "drizzle-orm";
import { db, bookings, users } from "@/lib/db";
import { Shell } from "../../_components/Shell";
import { StatusPill } from "../../page";
import { getAdminFromCookie } from "@/lib/admin-auth";
import { StatusEditor } from "./StatusEditor";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromCookie();
  if (!admin) return null;
  const { id } = await params;

  const [row] = await db.select({ booking: bookings, user: users })
    .from(bookings)
    .leftJoin(users, eq(bookings.userId, users.id))
    .where(eq(bookings.id, id))
    .limit(1);

  if (!row) {
    return <Shell active="bookings" adminEmail={admin.email}><h1>Не найдено</h1></Shell>;
  }

  const b = row.booking;
  const u = row.user;

  return (
    <Shell active="bookings" adminEmail={admin.email}>
      <Link href="/admin/bookings" style={{ color: "#8a8580", fontSize: 13 }}>← Все заказы</Link>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 300, marginTop: 12 }}>
        Заказ #{b.id.slice(0, 8).toUpperCase()}
        {b.amocrmLeadId && <span style={{ marginLeft: 12, color: "#8a8580", fontSize: "0.95rem" }}>amoCRM #{b.amocrmLeadId}</span>}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", marginTop: "1.5rem" }}>
        <div style={card}>
          <h2 style={cardTitle}>Информация о заказе</h2>
          <Field k="Аэропорт" v={b.airport} />
          <Field k="Заезд" v={b.dateFrom.toLocaleString("ru")} />
          <Field k="Выезд" v={b.dateTo.toLocaleString("ru")} />
          <Field k="Цена" v={`${Math.round(b.priceKopecks / 100).toLocaleString("ru")} ₽`} />
          <Field k="Машина" v={b.carNumber ?? "—"} />
          {b.carModel && <Field k="Модель" v={b.carModel} />}
          <Field k="Источник" v={b.source} />
          <Field k="Создан" v={b.createdAt.toLocaleString("ru")} />
          <Field k="Обновлён" v={b.updatedAt.toLocaleString("ru")} />
          <Field k="Начислено баллов" v={`+${b.loyaltyPointsEarned}`} />
          {b.loyaltyPointsUsed > 0 && <Field k="Списано баллов" v={String(b.loyaltyPointsUsed)} />}
          {b.notes && <Field k="Заметки" v={b.notes} />}
        </div>

        <div>
          <div style={card}>
            <h2 style={cardTitle}>Клиент</h2>
            {u ? (
              <>
                <Field k="Имя" v={`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"} />
                <Field k="Телефон" v={u.phone} />
                {u.email && <Field k="Email" v={u.email} />}
                <Field k="Тариф" v={u.loyaltyTier} />
                <Field k="Баллов" v={String(u.loyaltyPoints)} />
                <Link href={`/admin/users/${u.id}`} style={{ color: "#c45d3e", fontSize: 13, marginTop: 8, display: "inline-block" }}>
                  Профиль клиента →
                </Link>
              </>
            ) : <p style={{ color: "#8a8580", fontSize: 13 }}>Не привязан</p>}
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <h2 style={cardTitle}>Статус</h2>
            <div style={{ marginBottom: 12 }}><StatusPill status={b.status} /></div>
            <StatusEditor id={b.id} current={b.status} />
          </div>

          {Boolean(b.rawAmocrm) && (
            <details style={{ ...card, marginTop: 16 }}>
              <summary style={{ ...cardTitle, cursor: "pointer", margin: 0 }}>Raw amoCRM payload</summary>
              <pre style={{ fontSize: 10, overflow: "auto", marginTop: 12, color: "#3a3835" }}>
                {JSON.stringify(b.rawAmocrm, null, 2)}
              </pre>
            </details>
          )}
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
const cardTitle: React.CSSProperties = { fontSize: "0.95rem", fontWeight: 500, marginBottom: 12, color: "#0a0a0a" };
