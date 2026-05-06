/**
 * amoCRM client + STUB
 *
 * Если переменные окружения AMOCRM_* пустые — клиент работает в стаб-режиме:
 * возвращает мок-данные, в БД ничего не пишется на стороне amoCRM.
 *
 * Боевой режим использует OAuth2 с refresh-токеном.
 * Документация: https://www.amocrm.ru/developers/content/oauth/step-by-step
 */

import type { AmoCrmLead, AmoCrmContact, AmoCrmLeadWebhook } from "@uletnaya/shared";

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || "";
const CLIENT_ID = process.env.AMOCRM_CLIENT_ID || "";
const CLIENT_SECRET = process.env.AMOCRM_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.AMOCRM_REDIRECT_URI || "";
const REFRESH_TOKEN = process.env.AMOCRM_REFRESH_TOKEN || "";

const isStub = !AMOCRM_DOMAIN || !CLIENT_ID;

let _accessToken: string | null = null;
let _accessTokenExp = 0;

async function getAccessToken(): Promise<string> {
  if (isStub) return "STUB_TOKEN";
  if (_accessToken && Date.now() < _accessTokenExp) return _accessToken;

  const res = await fetch(`https://${AMOCRM_DOMAIN}/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) throw new Error(`amoCRM token refresh failed: ${res.status}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  _accessToken = data.access_token;
  _accessTokenExp = Date.now() + (data.expires_in - 60) * 1000;
  return _accessToken;
}

async function amoFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`https://${AMOCRM_DOMAIN}/api/v4${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`amoCRM ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

/* =========================================================================
 * Public API
 * ======================================================================= */

export async function getContact(contactId: number): Promise<AmoCrmContact> {
  if (isStub) return stubContact(contactId);
  return amoFetch(`/contacts/${contactId}?with=custom_fields_values`);
}

export async function getLead(leadId: number): Promise<AmoCrmLead> {
  if (isStub) return stubLead(leadId);
  return amoFetch(`/leads/${leadId}?with=contacts`);
}

export async function listLeadsByContact(contactId: number): Promise<AmoCrmLead[]> {
  if (isStub) return [stubLead(100), stubLead(101)];
  const data = await amoFetch(`/contacts/${contactId}?with=leads`) as { _embedded?: { leads?: AmoCrmLead[] } };
  return data._embedded?.leads ?? [];
}

export async function createLead(payload: {
  name: string;
  price?: number;
  contactId?: number;
  customFields?: { field_id: number; value: string | number }[];
}): Promise<AmoCrmLead> {
  if (isStub) {
    console.log("[amoCRM STUB] createLead", payload);
    return stubLead(Date.now());
  }
  const body = [{
    name: payload.name,
    price: payload.price,
    _embedded: payload.contactId ? { contacts: [{ id: payload.contactId }] } : undefined,
    custom_fields_values: payload.customFields?.map(f => ({
      field_id: f.field_id,
      values: [{ value: f.value }],
    })),
  }];
  const data = await amoFetch(`/leads`, { method: "POST", body: JSON.stringify(body) }) as { _embedded: { leads: AmoCrmLead[] } };
  return data._embedded.leads[0];
}

/**
 * Найти все сделки контакта по номеру телефона.
 * Используется в verify-otp для авто-привязки существующих заказов amoCRM к новому пользователю.
 */
export async function listLeadsByPhone(phone: string): Promise<AmoCrmLead[]> {
  if (isStub) return generateStubLeadsForPhone(phone);
  const search = await amoFetch(`/contacts?query=${encodeURIComponent(phone)}&with=leads`) as {
    _embedded?: { contacts?: (AmoCrmContact & { _embedded?: { leads?: { id: number }[] } })[] }
  };
  const contact = search._embedded?.contacts?.[0];
  if (!contact) return [];
  const leadIds = contact._embedded?.leads?.map(l => l.id) ?? [];
  if (leadIds.length === 0) return [];
  // Подгружаем детали каждой сделки
  const leads: AmoCrmLead[] = [];
  for (const id of leadIds.slice(0, 50)) {
    try { leads.push(await getLead(id)); } catch (e) { console.error(`getLead(${id}) failed:`, e); }
  }
  return leads;
}

/**
 * Список pipelines (воронок) — используется для discovery + поиска воронки по имени.
 */
export async function listPipelines(): Promise<{ id: number; name: string; statuses: { id: number; name: string }[] }[]> {
  if (isStub) return [{ id: 1, name: "Улётная парковка (STUB)", statuses: [{ id: 142, name: "Завершено" }, { id: 143, name: "Отменено" }] }];
  const data = await amoFetch(`/leads/pipelines`) as { _embedded: { pipelines: { id: number; name: string; _embedded: { statuses: { id: number; name: string }[] } }[] } };
  return data._embedded.pipelines.map(p => ({ id: p.id, name: p.name, statuses: p._embedded.statuses }));
}

/**
 * Найти ID воронки по имени (case-insensitive substring).
 * Для нашего use case — найти "Улётная парковка" среди воронок vsteh.amocrm.ru.
 */
export async function findPipelineId(nameSubstring: string): Promise<number | null> {
  const pipelines = await listPipelines();
  const needle = nameSubstring.toLowerCase().replace(/ё/g, "е");
  const found = pipelines.find(p => p.name.toLowerCase().replace(/ё/g, "е").includes(needle));
  return found?.id ?? null;
}

/**
 * Постранично выгружает сделки по фильтру pipeline_id (опционально + updated_after).
 * Используется backfill-скриптом и periodic sync.
 */
export async function* iterateLeads(filter: { pipelineId?: number; updatedAfter?: Date; limit?: number }): AsyncGenerator<AmoCrmLead, void, unknown> {
  if (isStub) {
    yield stubLead(1001); yield stubLead(1002); yield stubLead(1003);
    return;
  }
  const pageSize = 250;   // amoCRM max
  const limit = filter.limit ?? Infinity;
  let page = 1;
  let yielded = 0;

  while (yielded < limit) {
    const params = new URLSearchParams();
    params.set("limit", String(pageSize));
    params.set("page", String(page));
    params.set("with", "contacts");
    if (filter.pipelineId) params.set("filter[pipeline_id]", String(filter.pipelineId));
    if (filter.updatedAfter) params.set("filter[updated_at][from]", String(Math.floor(filter.updatedAfter.getTime() / 1000)));

    const data = await amoFetch(`/leads?${params.toString()}`) as { _embedded?: { leads?: AmoCrmLead[] }; _links?: { next?: { href: string } } };
    const leads = data._embedded?.leads ?? [];
    if (leads.length === 0) return;

    for (const lead of leads) {
      if (yielded >= limit) return;
      yield lead;
      yielded++;
    }

    if (!data._links?.next) return;
    page++;
  }
}

export async function findOrCreateContactByPhone(phone: string, name?: string): Promise<AmoCrmContact> {
  if (isStub) return stubContact(Date.now());
  // amoCRM поиск по телефону: /contacts?query=
  const search = await amoFetch(`/contacts?query=${encodeURIComponent(phone)}`) as { _embedded?: { contacts?: AmoCrmContact[] } };
  const existing = search._embedded?.contacts?.[0];
  if (existing) return existing;

  const body = [{ name: name ?? phone, custom_fields_values: [{ field_code: "PHONE", values: [{ value: phone, enum_code: "WORK" }] }] }];
  const created = await amoFetch(`/contacts`, { method: "POST", body: JSON.stringify(body) }) as { _embedded: { contacts: AmoCrmContact[] } };
  return created._embedded.contacts[0];
}

/* =========================================================================
 * Webhook payload parsing
 * amoCRM шлёт application/x-www-form-urlencoded с глубокой структурой —
 * для удобства превращаем в типизированную форму.
 * ======================================================================= */

export function parseWebhookPayload(formData: FormData): AmoCrmLeadWebhook {
  // amoCRM formdata: leads[add][0][id]=1234 → восстанавливаем дерево
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    setDeep(obj, key, typeof value === "string" ? value : value.name);
  }
  return obj as AmoCrmLeadWebhook;
}

function setDeep(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.replace(/\]/g, "").split("[");
  let cur: any = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    const nextNumeric = /^\d+$/.test(parts[i + 1]);
    if (cur[k] === undefined) cur[k] = nextNumeric ? [] : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

/* =========================================================================
 * Stubs (для dev без боевых ключей)
 * ======================================================================= */

function stubLead(id: number): AmoCrmLead {
  const now = Math.floor(Date.now() / 1000);
  return {
    id,
    status_id: 142,                          // 'Успешно реализовано' в дефолтной воронке
    pipeline_id: 1,
    responsible_user_id: 1,
    price: 1050,
    contacts: [{ id: 99999 }],
    created_at: now - 86400 * 7,
    updated_at: now,
    custom_fields_values: [
      { field_id: 1, field_code: "AIRPORT", values: [{ value: "SVO" }] },
      { field_id: 2, field_code: "DATE_FROM", values: [{ value: now * 1000 }] },
      { field_id: 3, field_code: "DATE_TO", values: [{ value: (now + 86400 * 7) * 1000 }] },
    ],
  };
}

/* ---------- Детерминированные stub-данные на основе phone ---------- */

// Простой не-крипто-хеш строки → положительное число
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Генератор уникальных stub-броней для конкретного телефона */
function generateStubLeadsForPhone(phone: string): AmoCrmLead[] {
  const seed = hashString(phone);
  const count = 1 + (seed % 4);   // 1-4 брони на номер

  const airports = ["SVO", "DME", "VKO"] as const;
  const statusMap = [142, 142, 142, 1, 1, 0, 143] as const;   // mostly completed, реже cancelled
  const carPrefixes = ["А", "В", "Е", "К", "М", "Н", "О", "Р", "С", "Т", "У", "Х"];
  const carRegions = [77, 99, 177, 197, 199, 777];

  const leads: AmoCrmLead[] = [];
  for (let i = 0; i < count; i++) {
    const subseed = seed + i * 31;
    const airport = airports[subseed % airports.length];
    const days = 1 + (subseed % 14);                          // 1-14 дней
    const dayOffset = -45 + (subseed % 90);                   // -45..+45 от сейчас
    const dateFrom = new Date();
    dateFrom.setHours(10, 0, 0, 0);
    dateFrom.setDate(dateFrom.getDate() + dayOffset);
    const dateTo = new Date(dateFrom);
    dateTo.setDate(dateTo.getDate() + days);
    const price = days * 150;
    const status_id = statusMap[subseed % statusMap.length];
    const carNumber =
      carPrefixes[subseed % carPrefixes.length] +
      String(100 + (subseed % 900)) +
      carPrefixes[(subseed >> 4) % carPrefixes.length] +
      carPrefixes[(subseed >> 8) % carPrefixes.length] +
      carRegions[(subseed >> 12) % carRegions.length];

    // Уникальный lead_id из seed — не пересекается с другими телефонами
    const leadId = seed * 1000 + i;
    const contactId = (seed % 100000) + 50000;

    leads.push({
      id: leadId,
      status_id,
      pipeline_id: 1,
      responsible_user_id: 1,
      price,
      contacts: [{ id: contactId }],
      created_at: Math.floor(dateFrom.getTime() / 1000) - 86400 * 3,
      updated_at: Math.floor(Date.now() / 1000),
      custom_fields_values: [
        { field_id: 1, field_code: "AIRPORT",    values: [{ value: airport }] },
        { field_id: 2, field_code: "DATE_FROM",  values: [{ value: dateFrom.getTime() }] },
        { field_id: 3, field_code: "DATE_TO",    values: [{ value: dateTo.getTime() }] },
        { field_id: 4, field_code: "CAR_NUMBER", values: [{ value: carNumber }] },
      ],
    });
  }
  return leads;
}

function stubContact(id: number): AmoCrmContact {
  return {
    id,
    name: "",                                        // в stub имя пустое → UI покажет "Гость"
    created_at: Math.floor(Date.now() / 1000) - 86400 * 30,
    updated_at: Math.floor(Date.now() / 1000),
    custom_fields_values: [
      { field_id: 100, field_code: "PHONE", values: [{ value: "+79991234567" }] },
    ],
  };
}

export const amocrmInfo = { isStub, domain: AMOCRM_DOMAIN };
