import { db, adminAuditLog } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { desc, eq, like, and } from "drizzle-orm";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ action?: string; q?: string; limit?: string }>;
}

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: PageProps) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  const sp = await searchParams;
  const action = sp.action ?? "";
  const q = sp.q ?? "";
  const limit = Math.min(500, Math.max(20, parseInt(sp.limit ?? "100", 10)));

  const conditions = [];
  if (action) conditions.push(eq(adminAuditLog.action, action));
  if (q) conditions.push(like(adminAuditLog.adminEmail, `%${q}%`));

  const rows = await db
    .select()
    .from(adminAuditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);

  // Уникальные действия для фильтра
  const allActions = await db
    .select({ action: adminAuditLog.action })
    .from(adminAuditLog)
    .groupBy(adminAuditLog.action)
    .limit(50);
  const uniqueActions = Array.from(new Set(allActions.map(a => a.action))).sort();

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--primary)", fontWeight: 700, marginBottom: 4 }}>
            🔍 АУДИТ-ЛОГ
          </div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Действия администраторов</h1>
        </div>
        <form method="get" action="/admin/audit" style={{ display: "flex", gap: 8 }}>
          <select name="action" defaultValue={action} style={inp}>
            <option value="">Все действия</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input name="q" defaultValue={q} placeholder="email админа..." style={inp} />
          <input name="limit" defaultValue={String(limit)} type="number" min="20" max="500" style={{ ...inp, width: 80 }} />
          <button type="submit" style={{ ...inp, background: "var(--primary)", color: "#fff", border: 0, cursor: "pointer", fontWeight: 700 }}>Фильтр</button>
        </form>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 16px rgba(15,77,71,0.08)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px 200px 140px 1fr 200px 110px", padding: "12px 16px", background: "#0f1419", color: "#fff", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
          <div>Время</div>
          <div>Админ</div>
          <div>Действие</div>
          <div>Ресурс / payload</div>
          <div>IP</div>
          <div>UA (кратко)</div>
        </div>
        {rows.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#8a8f9f" }}>Записей нет</div>}
        {rows.map((r, i) => (
          <div key={r.id} style={{
            display: "grid", gridTemplateColumns: "150px 200px 140px 1fr 200px 110px",
            padding: "12px 16px", borderBottom: i < rows.length - 1 ? "1px solid #e5e7eb" : "none",
            background: i % 2 === 0 ? "#fff" : "#fafbfc", fontSize: 13,
          }}>
            <div style={{ color: "#8a8f9f", fontFamily: "monospace", fontSize: 12 }}>
              {new Date(r.createdAt).toLocaleString("ru", { timeZone: "Europe/Moscow" })}
            </div>
            <div style={{ fontWeight: 600 }}>{r.adminEmail ?? "—"}</div>
            <div>
              <span style={{ background: actionBg(r.action), color: actionFg(r.action), padding: "3px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                {r.action}
              </span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "#4b5161" }}>
              {r.resource ?? ""}
              {r.payload ? <div style={{ color: "#8a8f9f", marginTop: 2, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 400 }}>{JSON.stringify(r.payload)}</div> : null}
            </div>
            <div style={{ color: "#8a8f9f", fontFamily: "monospace", fontSize: 11 }}>{r.ip ?? "—"}</div>
            <div style={{ color: "#8a8f9f", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.userAgent ?? ""}>
              {shortUa(r.userAgent)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: "#8a8f9f" }}>
        Показано {rows.length} записей · Время в МСК · Полная история хранится бессрочно
      </div>
    </main>
  );
}

function actionBg(a: string): string {
  if (a.startsWith("login")) return "#ecf8f1";
  if (a.startsWith("logout")) return "#f4f5f7";
  if (a.includes("delete")) return "#fef2f2";
  if (a.includes("adjust")) return "rgba(217,148,65,0.12)";
  return "rgba(63,184,175,0.12)";
}
function actionFg(a: string): string {
  if (a.startsWith("login")) return "#1a6e4e";
  if (a.startsWith("logout")) return "#4b5161";
  if (a.includes("delete")) return "#991b1b";
  if (a.includes("adjust")) return "#d99441";
  return "#0f4d47";
}
function shortUa(ua: string | null): string {
  if (!ua) return "—";
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|curl)\/?(\d+)?/);
  return m ? m[0] : ua.slice(0, 14);
}

const inp = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 13,
};
