import { NextResponse } from "next/server";
import { db, bookings, users } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getLead, parseWebhookPayload } from "@/lib/amocrm";
import { awardForBooking, awardReferrerOnFirstCompleted } from "@/lib/loyalty";
import { syncTierToAmocrm } from "@/lib/amocrm-sync";
import type { AmoCrmLeadWebhook } from "@uletnaya/shared";

/**
 * amoCRM webhook receiver.
 *   - upsert в bookings по amocrm_lead_id
 *   - если статус → completed: начислить лояльность + sync tier обратно в amoCRM
 *   - первый completed-booking referee → бонус рефереру
 */

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let payload: AmoCrmLeadWebhook;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    payload = parseWebhookPayload(await req.formData());
  } else {
    payload = await req.json().catch(() => ({}));
  }

  console.log("[amoCRM webhook]", JSON.stringify(payload).slice(0, 500));

  const allLeads = [
    ...(payload.leads?.add ?? []),
    ...(payload.leads?.update ?? []),
    ...(payload.leads?.status ?? []),
  ];

  let processed = 0;
  let awarded = 0;

  for (const leadStub of allLeads) {
    if (!leadStub.id) continue;

    let full;
    try { full = await getLead(Number(leadStub.id)); } catch (e) { console.error(e); continue; }

    const customs = Object.fromEntries(
      (full.custom_fields_values ?? []).map(f => [f.field_code ?? `field_${f.field_id}`, f.values?.[0]?.value])
    );
    const airport = (customs.AIRPORT as "SVO" | "DME" | "VKO") || "SVO";
    const dateFrom = customs.DATE_FROM ? new Date(Number(customs.DATE_FROM)) : new Date();
    const dateTo = customs.DATE_TO ? new Date(Number(customs.DATE_TO)) : new Date();

    const contactId = full.contacts?.[0]?.id;
    let userId: string | null = null;
    if (contactId) {
      const [u] = await db.select().from(users).where(eq(users.amocrmContactId, contactId)).limit(1);
      userId = u?.id ?? null;
    }

    const status = mapStatus(full.status_id);
    const wasCompleted = status === "completed";

    const [b] = await db
      .insert(bookings)
      .values({
        amocrmLeadId: full.id,
        userId,
        airport,
        dateFrom,
        dateTo,
        priceKopecks: (full.price ?? 0) * 100,
        status,
        source: "amocrm",
        rawAmocrm: full as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: bookings.amocrmLeadId,
        set: {
          status,
          priceKopecks: (full.price ?? 0) * 100,
          rawAmocrm: full as unknown as Record<string, unknown>,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();

    processed++;

    // Лояльность: только при completed и наличии userId
    if (wasCompleted && b.userId) {
      const result = await awardForBooking(b.id);
      if (result) {
        awarded += result.awarded;
        // Реферер получает бонус при первом completed-booking приглашённого
        await awardReferrerOnFirstCompleted(b.userId);
        // Зеркало в amoCRM
        const [u] = await db.select().from(users).where(eq(users.id, b.userId)).limit(1);
        if (u) await syncTierToAmocrm({
          amocrmContactId: u.amocrmContactId,
          tier: u.loyaltyTier,
          points: u.loyaltyPoints,
        });
      }
    }
  }

  return NextResponse.json({ ok: true, processed, awarded });
}

function mapStatus(statusId: number): "new" | "confirmed" | "active" | "completed" | "cancelled" {
  if (statusId === 142) return "completed";
  if (statusId === 143) return "cancelled";
  if (statusId >= 1) return "confirmed";
  return "new";
}
