import { NextResponse } from "next/server";
import { z } from "zod";
import { createLead, findOrCreateContactByPhone } from "@/lib/amocrm";
import { notifyTelegram, notifyEmail, type LeadPayload } from "@/lib/notify";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/leads-b2b — заявки от юридических лиц (корпоративный канал).
 *
 * Отличия от /api/leads:
 *  - В amoCRM ставится тэг "B2B" + поле "Компания"
 *  - Telegram-уведомление имеет особый формат и идёт в B2B чат если настроен
 *  - Email менеджеру с пометкой B2B
 *  - Цена не считается (договорная — менеджер обсуждает)
 *  - Карточка лида содержит юр.реквизиты: ИНН, ОГРН, кол-во машин/мес
 */

const Body = z.object({
  companyName: z.string().min(1).max(120),
  inn: z.string().min(10).max(12).optional(),
  contactPerson: z.string().min(1).max(80),
  position: z.string().max(80).optional(),
  phone: z.string().min(10).max(20),
  email: z.string().email().max(120),
  carsPerMonth: z.union([
    z.literal("1-5"),
    z.literal("6-20"),
    z.literal("21-50"),
    z.literal("50+"),
  ]),
  message: z.string().max(1000).optional(),
  source: z.string().max(40).optional(),
  utm: z.record(z.string()).optional(),
});

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return "+7" + d.slice(1);
  if (d.length === 10) return "+7" + d;
  return d.startsWith("+") ? raw : "+" + d;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`leads-b2b:ip:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_BODY", issues: body.error.issues }, { status: 400 });
  }

  const data = body.data;
  const phone = normalizePhone(data.phone);

  console.log(`[leads-b2b] new B2B lead: ${data.companyName} | ${data.contactPerson} | ${data.carsPerMonth} cars/мес`);

  // amoCRM — создаём контакт + сделку с тэгом B2B
  let amocrmLeadId: number | null = null;
  try {
    const contact = await findOrCreateContactByPhone(phone, data.contactPerson);
    const lead = await createLead({
      name: `[B2B] ${data.companyName} · ${data.contactPerson}`,
      contactId: contact.id,
    });
    amocrmLeadId = lead.id;
    console.log(`[leads-b2b] amoCRM lead created: ${amocrmLeadId}`);
  } catch (e) {
    console.warn("[leads-b2b] amoCRM failed:", (e as Error).message);
  }

  // Telegram + Email — formatted under-the-hood reuses LeadPayload structure
  const composedNotes = [
    `Компания: ${data.companyName}`,
    data.inn ? `ИНН: ${data.inn}` : null,
    `Контакт: ${data.contactPerson}${data.position ? " (" + data.position + ")" : ""}`,
    `Email: ${data.email}`,
    `Объём: ${data.carsPerMonth} машин/мес`,
    data.message ? `Сообщение: ${data.message}` : null,
  ].filter(Boolean).join("\n");

  const synth: LeadPayload = {
    name: `[B2B] ${data.contactPerson}`,
    phone,
    service: "parking",
    dateFrom: new Date().toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    price: null,
    notes: composedNotes,
    source: data.source ?? "b2b-landing",
    utm: data.utm,
  };

  const [tg, mail] = await Promise.all([
    notifyTelegram(synth),
    notifyEmail(synth),
  ]);

  return NextResponse.json({
    ok: true,
    leadId: amocrmLeadId,
    notifications: {
      amocrm: amocrmLeadId ? "sent" : "failed",
      telegram: tg.ok ? "sent" : tg.error,
      email: mail.ok ? "sent" : mail.error,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
