/**
 * Синхронизация наших данных обратно в amoCRM как custom fields контакта.
 * Карта field_id → берётся из docs/04-amocrm-discovery.md после прогона discovery-скрипта.
 *
 * До запуска discovery — все вызовы no-op (логируют в консоль).
 */

import type { Tier } from "./loyalty";

// TODO: после discovery подставить реальные ID кастомных полей из amoCRM
const FIELD_IDS = {
  LOYALTY_TIER:   0,   // например 654321
  LOYALTY_POINTS: 0,
} as const;

const isStub = !process.env.AMOCRM_DOMAIN || !process.env.AMOCRM_CLIENT_ID;

async function patchContact(contactId: number, customFields: { field_id: number; value: string | number }[]) {
  if (isStub || !contactId || customFields.some(f => f.field_id === 0)) {
    console.log("[amoCRM sync STUB] contact", contactId, customFields);
    return;
  }
  // Реальная имплементация — после получения токенов и field_id
  const { default: amocrm } = await import("./amocrm");
  // ... вызов amoFetch(`/contacts/${contactId}`, PATCH, body)
  // Пока намеренно оставлен no-op — добавим в Phase 2.5 после discovery.
  void amocrm;
}

export async function syncTierToAmocrm(args: {
  amocrmContactId: number | null;
  tier: Tier;
  points: number;
}) {
  if (!args.amocrmContactId) return;
  await patchContact(args.amocrmContactId, [
    { field_id: FIELD_IDS.LOYALTY_TIER, value: args.tier },
    { field_id: FIELD_IDS.LOYALTY_POINTS, value: args.points },
  ]);
}
