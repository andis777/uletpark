/**
 * Аудит-лог админских действий.
 * Использование:
 *   await logAudit({ admin, action: "update_booking", resource: `booking:${id}`, payload: {...}, req });
 *
 * Никогда не падает наружу — ошибка лога не должна блокировать действие.
 */

import { db, adminAuditLog } from "@/lib/db";
import type { AdminSession } from "@/lib/admin-auth";

export interface AuditEntry {
  admin?: AdminSession | null;
  action: string;
  resource?: string;
  payload?: Record<string, unknown>;
  req?: Request;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const ip = entry.req?.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? entry.req?.headers.get("x-real-ip")
      ?? null;
    const ua = entry.req?.headers.get("user-agent") ?? null;

    await db.insert(adminAuditLog).values({
      adminId: entry.admin?.sub ?? null,
      adminEmail: entry.admin?.email ?? null,
      action: entry.action,
      resource: entry.resource ?? null,
      payload: entry.payload as never,
      ip,
      userAgent: ua,
    });
  } catch (e) {
    console.warn("[audit] failed to log:", (e as Error).message, entry.action);
  }
}
