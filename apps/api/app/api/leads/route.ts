import { NextResponse } from "next/server";
import { z } from "zod";
import { createLead, findOrCreateContactByPhone } from "@/lib/amocrm";
import { notifyTelegram, notifyEmail, notifyClient, type LeadPayload } from "@/lib/notify";
import { calculate } from "@/lib/calculator";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/leads — приём заявок с лендинга.
 *
 * 1. Валидируем поля
 * 2. Считаем цену (если не передали)
 * 3. Создаём лид в amoCRM (или STUB-лог)
 * 4. Шлём в Telegram-группу
 * 5. Шлём на email менеджера
 * 6. Возвращаем { ok: true, leadId } — даже если notify-каналы упали (главное — сохранили в amoCRM)
 *
 * CORS открыт для cross-origin (uletnayaparkovka.ru → api.uletnayaparkovka.ru).
 */

const Body = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().min(10).max(20),
  service: z.enum(["parking", "nochevka"]).default("parking"),
  dateFrom: z.string().min(8),
  dateTo: z.string().min(8),
  airport: z.enum(["SVO", "DME", "VKO"]).default("SVO"),
  nochevkaHours: z.union([z.literal(6), z.literal(12), z.literal(24)]).optional(),
  carNumber: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  source: z.string().max(40).optional(),
  utm: z.record(z.string()).optional(),
  email: z.string().email().max(120).optional(),
});

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && (d.startsWith("7") || d.startsWith("8"))) return "+7" + d.slice(1);
  if (d.length === 10) return "+7" + d;
  return d.startsWith("+") ? raw : "+" + d;
}

export async function POST(req: Request) {
  // Rate limit по IP — защита от спам-ботов
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`leads:ip:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_BODY", issues: body.error.issues }, { status: 400 });
  }

  const data = body.data;
  const phone = normalizePhone(data.phone);

  // Дата в ISO — нормализуем YYYY-MM-DD → ISO datetime
  const fromIso = data.dateFrom.length === 10 ? `${data.dateFrom}T12:00:00Z` : data.dateFrom;
  const toIso = data.dateTo.length === 10 ? `${data.dateTo}T12:00:00Z` : data.dateTo;

  // Расчёт цены — повторяем калькулятор для надёжности (не доверяем клиенту)
  let price: number | null = null;
  try {
    const calc = calculate({
      airport: data.airport,
      dateFrom: fromIso,
      dateTo: toIso,
      service: data.service,
      nochevkaHours: data.nochevkaHours,
    });
    price = calc.finalRub ?? calc.totalRub;
  } catch (e) {
    console.warn("[leads] calc failed:", (e as Error).message);
  }

  const leadPayload: LeadPayload = {
    name: data.name,
    phone,
    service: data.service,
    dateFrom: data.dateFrom.slice(0, 10),
    dateTo: data.dateTo.slice(0, 10),
    price,
    carNumber: data.carNumber,
    nochevkaHours: data.nochevkaHours,
    notes: data.notes,
    source: data.source ?? "web-landing",
    utm: data.utm,
  };

  console.log(`[leads] new lead: ${data.name} ${phone} ${data.service} ${data.dateFrom}→${data.dateTo} = ${price}₽`);

  // 1) amoCRM — параллельно, не блокируем ответ
  let amocrmLeadId: number | null = null;
  try {
    const contact = await findOrCreateContactByPhone(phone, data.name);
    const lead = await createLead({
      name: `${data.service === "parking" ? "Парковка" : "Ночёвка"} · ${data.name}`,
      price: price ?? undefined,
      contactId: contact.id,
    });
    amocrmLeadId = lead.id;
    console.log(`[leads] amoCRM lead created: ${amocrmLeadId}`);
  } catch (e) {
    console.warn("[leads] amoCRM failed:", (e as Error).message);
  }

  // 2-4) Telegram + Email менеджеру + Email клиенту — параллельно
  const [tg, mail, clientMail] = await Promise.all([
    notifyTelegram(leadPayload),
    notifyEmail(leadPayload),
    notifyClient({ ...leadPayload, email: data.email }),
  ]);

  return NextResponse.json({
    ok: true,
    leadId: amocrmLeadId,
    notifications: {
      amocrm: amocrmLeadId ? "sent" : "failed",
      telegram: tg.ok ? "sent" : tg.error,
      email: mail.ok ? "sent" : mail.error,
      clientEmail: clientMail.ok ? "sent" : clientMail.error,
    },
    price,
  });
}

// OPTIONS — preflight для cross-origin форм
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
