import { db, loyaltyRules } from "@/lib/db";
import { asc } from "drizzle-orm";
import { Shell } from "../_components/Shell";
import { getAdminFromCookie } from "@/lib/admin-auth";
import { RulesEditor } from "./RulesEditor";

export const dynamic = "force-dynamic";

export default async function LoyaltyAdmin() {
  const admin = await getAdminFromCookie();
  if (!admin) return null;

  let rules: typeof loyaltyRules.$inferSelect[] = [];
  let dbErr: string | null = null;
  try {
    rules = await db.select().from(loyaltyRules).orderBy(asc(loyaltyRules.createdAt));
  } catch (e) { dbErr = (e as Error).message; }

  return (
    <Shell active="loyalty" adminEmail={admin.email}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 300, marginBottom: 8 }}>Правила лояльности</h1>
      <p style={{ color: "#8a8580", marginBottom: 24, fontSize: 14 }}>
        Управляйте кешбэком, тирами и реферальными бонусами. Изменения применяются сразу.
      </p>

      {dbErr && <div style={{ color: "#a54a3a", padding: 12, background: "#fbece8", borderRadius: 8, marginBottom: 16 }}>{dbErr}</div>}

      <RulesEditor initial={rules.map(r => ({
        id: r.id, name: r.name, type: r.type,
        config: r.config as Record<string, unknown>,
        active: r.active,
      }))} />
    </Shell>
  );
}
