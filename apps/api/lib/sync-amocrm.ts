/**
 * Sync helpers: импорт сделок из amoCRM в bookings + привязка к users по phone.
 *
 * Используется:
 *   - backfill-скриптом (разовый импорт всех существующих сделок)
 *   - admin /sync кнопкой (incremental sync «обновлённое за N дней»)
 *   - verify-otp (точечная привязка сделок при логине нового пользователя)
 */

import { eq, and, isNull, sql } from "drizzle-orm";
import { db, bookings, users } from "@uletnaya/db";
import { awardForBooking, awardReferrerOnFirstCompleted } from "./loyalty";
import {
  iterateLeads,
  findPipelineId,
  listLeadsByPhone,
  getContact,
  amocrmInfo,
} from "./amocrm";
import type { AmoCrmLead, Airport } from "@uletnaya/shared";

export interface SyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  linkedToUsers: number;
  skipped: number;
  errors: string[];
  pipelineId: number | null;
}

/**
 * Извлекает ключевые поля из custom_fields_values по нескольким попыткам имён,
 * т.к. до discovery точные field_id неизвестны.
 */
function extractFromLead(lead: AmoCrmLead): {
  airport: Airport;
  dateFrom: Date;
  dateTo: Date;
  carNumber: string | null;
  carModel: string | null;
} {
  const customs: Record<string, string | number | boolean | undefined> = {};
  for (const f of lead.custom_fields_values ?? []) {
    const key = f.field_code ?? f.field_name ?? `field_${f.field_id}`;
    customs[key] = f.values?.[0]?.value;
    customs[key.toLowerCase()] = f.values?.[0]?.value;
  }

  // Airport: пробуем разные варианты названий
  const airportRaw = String(
    customs.AIRPORT ?? customs.airport ?? customs["аэропорт"] ?? customs.Аэропорт ?? "SVO"
  ).toUpperCase();
  const airport: Airport =
    airportRaw.includes("DOM") || airportRaw.includes("ДОМ") ? "DME" :
    airportRaw.includes("VNU") || airportRaw.includes("ВНУ") ? "VKO" :
    "SVO";

  const dateFromRaw = customs.DATE_FROM ?? customs.date_from ?? customs["дата заезда"] ?? customs["заезд"];
  const dateToRaw   = customs.DATE_TO   ?? customs.date_to   ?? customs["дата выезда"] ?? customs["выезд"];

  const parseDate = (v: unknown): Date => {
    if (!v) return new Date();
    if (typeof v === "number") return new Date(v * (v < 1e12 ? 1000 : 1));   // unix sec or ms
    if (typeof v === "string") {
      const parsed = new Date(v);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  return {
    airport,
    dateFrom: parseDate(dateFromRaw),
    dateTo: parseDate(dateToRaw),
    carNumber: (customs.CAR_NUMBER ?? customs["гос_номер"] ?? customs["номер"] ?? null) as string | null,
    carModel: (customs.CAR_MODEL ?? customs["модель"] ?? null) as string | null,
  };
}

/**
 * Подтянуть телефон контакта (для привязки к нашим users).
 * Кэширует чтобы не дёргать amoCRM на каждый лид.
 */
const contactPhoneCache = new Map<number, string | null>();
async function getContactPhone(contactId: number): Promise<string | null> {
  if (contactPhoneCache.has(contactId)) return contactPhoneCache.get(contactId)!;
  try {
    const c = await getContact(contactId);
    const phoneField = c.custom_fields_values?.find(f =>
      f.field_code === "PHONE" || (f.field_name ?? "").toLowerCase().includes("телефон")
    );
    const raw = phoneField?.values?.[0]?.value;
    const phone = raw ? normalizePhone(String(raw)) : null;
    contactPhoneCache.set(contactId, phone);
    return phone;
  } catch (e) {
    console.error(`getContactPhone(${contactId}) failed:`, e);
    contactPhoneCache.set(contactId, null);
    return null;
  }
}

function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return "+7" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("7")) return "+" + digits;
  if (digits.length === 10) return "+7" + digits;
  return null;
}

function mapStatus(statusId: number): "new" | "confirmed" | "active" | "completed" | "cancelled" {
  if (statusId === 142) return "completed";
  if (statusId === 143) return "cancelled";
  if (statusId >= 1) return "confirmed";
  return "new";
}

/* =========================================================================
 * Главный sync
 * ======================================================================= */

export async function syncFromPipeline(opts: {
  pipelineName?: string;        // ищем по подстроке (default: "Улётная парковка")
  updatedAfter?: Date;           // incremental: только обновлённые после
  limit?: number;
} = {}): Promise<SyncResult> {
  const result: SyncResult = {
    fetched: 0, inserted: 0, updated: 0, linkedToUsers: 0, skipped: 0, errors: [], pipelineId: null,
  };

  const pipelineName = opts.pipelineName ?? "Улётная парковка";
  // Воронка «Улетная парковка» = 7000398 (сделки создаются там через v2/hash-режим).
  // РАНЬШЕ: findPipelineId(name) шёл через v4-discovery (OAuth) и промахивался на воронку 1
  // → iterateLeads тянул пустую воронку → в БД 0 заявок → «0» в дневном отчёте. Берём ID напрямую.
  const configured = Number(process.env.AMOCRM_PIPELINE_ID || 7000398);
  let pipelineId: number | null = configured;
  // Discovery через findPipelineId (v4/stub) промахивался на воронку 1 — используем его ТОЛЬКО
  // как фолбэк при НЕсконфигурированном ID и игнорируем явно неверный результат (<=1).
  if (!configured) {
    const discovered = await findPipelineId(pipelineName).catch(() => null);
    if (discovered && discovered > 1) pipelineId = discovered;
  }

  if (!pipelineId && !amocrmInfo.isStub) {
    result.errors.push(`Pipeline "${pipelineName}" not found in amoCRM. Run /admin/sync с другим именем или проверь discovery.`);
    return result;
  }
  result.pipelineId = pipelineId;

  for await (const lead of iterateLeads({ pipelineId: pipelineId ?? undefined, updatedAfter: opts.updatedAfter, limit: opts.limit })) {
    result.fetched++;

    try {
      const { airport, dateFrom, dateTo, carNumber, carModel } = extractFromLead(lead);

      // Привязка к user — по phone контакта
      let userId: string | null = null;
      const contactId = lead.contacts?.[0]?.id;
      if (contactId) {
        const phone = await getContactPhone(contactId);
        if (phone) {
          const [u] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
          if (u) {
            userId = u.id;
            // Заодно линкуем amocrm_contact_id если ещё не привязан
            if (!u.amocrmContactId) {
              await db.update(users).set({ amocrmContactId: contactId, updatedAt: sql`NOW()` }).where(eq(users.id, u.id));
            }
          }
        }
      }
      if (userId) result.linkedToUsers++;

      // Upsert по amocrm_lead_id
      const status = mapStatus(lead.status_id);
      const existing = await db.select().from(bookings).where(eq(bookings.amocrmLeadId, lead.id)).limit(1);

      if (existing.length === 0) {
        await db.insert(bookings).values({
          amocrmLeadId: lead.id,
          userId,
          airport,
          dateFrom,
          dateTo,
          priceKopecks: (lead.price ?? 0) * 100,
          status,
          carNumber,
          carModel,
          source: "amocrm",
          rawAmocrm: lead as unknown as Record<string, unknown>,
        });
        result.inserted++;
      } else {
        await db.update(bookings).set({
          userId: userId ?? existing[0].userId,
          airport,
          dateFrom,
          dateTo,
          priceKopecks: (lead.price ?? 0) * 100,
          status,
          carNumber: carNumber ?? existing[0].carNumber,
          carModel: carModel ?? existing[0].carModel,
          rawAmocrm: lead as unknown as Record<string, unknown>,
          updatedAt: sql`NOW()`,
        }).where(eq(bookings.amocrmLeadId, lead.id));
        result.updated++;
      }

      // Начисление баллов. Раньше вызывалось ТОЛЬКО из вебхука amoCRM, а брони
      // приходят и этим путём — поэтому за 57 завершённых броней не начислено
      // ничего. awardForBooking идемпотентна (проверяет прошлую транзакцию по
      // броне), так что повторные прогоны безопасны.
      if (status === "completed") await awardCompleted(lead.id);
    } catch (e) {
      result.errors.push(`Lead ${lead.id}: ${(e as Error).message}`);
      result.skipped++;
    }
  }

  return result;
}

/**
 * Начислить баллы по завершённой броне сделки amoCRM.
 * Ошибка начисления не должна ломать синхронизацию — бронь уже сохранена.
 */
async function awardCompleted(amocrmLeadId: number): Promise<void> {
  try {
    const [b] = await db.select({ id: bookings.id, userId: bookings.userId })
      .from(bookings).where(eq(bookings.amocrmLeadId, amocrmLeadId)).limit(1);
    if (!b?.userId) return;
    const r = await awardForBooking(b.id);
    if (r) await awardReferrerOnFirstCompleted(b.userId);
  } catch (e) {
    console.warn(`[loyalty] начисление по лиду ${amocrmLeadId} не удалось:`, (e as Error).message);
  }
}

/**
 * Линковка сделок к одному конкретному пользователю по его телефону.
 * Вызывается в verify-otp при первом логине.
 */
export async function linkBookingsToUserByPhone(userId: string, phone: string): Promise<{ linked: number }> {
  // STUB режим: даём мок-брони из listLeadsByPhone (которая в STUB вернёт 2 фейковых лида).
  // Раньше тут был early-return чтобы не засорять БД, но это мешает демонстрировать UI.
  // Если нужно строго пустую БД в STUB — установи AMOCRM_DISABLE_STUB_LINK=1.
  if (amocrmInfo.isStub && process.env.AMOCRM_DISABLE_STUB_LINK === "1") {
    return { linked: 0 };
  }

  // 1. Найти все лиды контакта в amoCRM по телефону
  const leads = await listLeadsByPhone(phone);
  if (leads.length === 0) return { linked: 0 };

  let linked = 0;
  for (const lead of leads) {
    try {
      const { airport, dateFrom, dateTo, carNumber, carModel } = extractFromLead(lead);
      const status = mapStatus(lead.status_id);
      const existing = await db.select().from(bookings).where(eq(bookings.amocrmLeadId, lead.id)).limit(1);

      if (existing.length === 0) {
        await db.insert(bookings).values({
          amocrmLeadId: lead.id,
          userId,
          airport, dateFrom, dateTo,
          priceKopecks: (lead.price ?? 0) * 100,
          status, carNumber, carModel,
          source: "amocrm",
          rawAmocrm: lead as unknown as Record<string, unknown>,
        });
        linked++;
      } else if (!existing[0].userId) {
        await db.update(bookings).set({ userId, updatedAt: sql`NOW()` })
          .where(eq(bookings.amocrmLeadId, lead.id));
        linked++;
      }

      // Человек зарегистрировался ПОСЛЕ поездки — его прошлые завершённые брони
      // только сейчас получили userId, а значит только сейчас могут дать баллы.
      if (status === "completed") await awardCompleted(lead.id);
    } catch (e) {
      console.error(`linkBookingsToUserByPhone lead=${lead.id}:`, e);
    }
  }

  return { linked };
}

/**
 * «Слинковать сирот» — пробежаться по bookings.userId IS NULL и попытаться найти user по phone amoCRM-контакта.
 * Запускается из admin вручную или раз в день cron-ом.
 */
export async function linkOrphanBookings(): Promise<{ scanned: number; linked: number }> {
  const orphans = await db.select().from(bookings).where(and(isNull(bookings.userId), sql`${bookings.amocrmLeadId} IS NOT NULL`)).limit(500);
  let linked = 0;

  for (const b of orphans) {
    try {
      // Достаём contact_id из raw_amocrm, либо из rеальной amoCRM
      const raw = b.rawAmocrm as { contacts?: { id: number }[] } | null;
      const contactId = raw?.contacts?.[0]?.id;
      if (!contactId) continue;

      const phone = await getContactPhone(contactId);
      if (!phone) continue;

      const [u] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (u) {
        await db.update(bookings).set({ userId: u.id, updatedAt: sql`NOW()` }).where(eq(bookings.id, b.id));
        if (!u.amocrmContactId) {
          await db.update(users).set({ amocrmContactId: contactId, updatedAt: sql`NOW()` }).where(eq(users.id, u.id));
        }
        linked++;

        // Бронь-сирота могла быть уже завершена — начисляем, раз хозяин найден.
        if (b.status === "completed") {
          const r = await awardForBooking(b.id);
          if (r) await awardReferrerOnFirstCompleted(u.id);
        }
      }
    } catch (e) {
      console.error(`linkOrphanBookings booking=${b.id}:`, e);
    }
  }

  return { scanned: orphans.length, linked };
}
