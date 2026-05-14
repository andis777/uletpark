/**
 * Уведомления о новых лидах — Telegram + Email.
 * Все секреты приходят из ENV. Если значений нет — соответствующий канал тихо
 * пропускается (полезно для STUB-режима).
 */

import nodemailer from "nodemailer";

const TG_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;
const SMTP_TO = process.env.SMTP_TO ?? "uletnayaparkovka@gmail.com";

export interface LeadPayload {
  name: string;
  phone: string;
  service: "parking" | "nochevka";
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
  price?: number | null;
  carNumber?: string;
  nochevkaHours?: 6 | 12 | 24;
  source?: string; // "web-landing" | "mobile-app" | etc
  utm?: Record<string, string>;
  notes?: string;
}

/* ---------- Telegram ---------- */

export async function notifyTelegram(lead: LeadPayload): Promise<{ ok: boolean; error?: string }> {
  if (!TG_BOT || !TG_CHAT) {
    console.log("[notify] Telegram skip — no token/chat configured");
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const text = buildTelegramMessage(lead);

  try {
    const r = await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      console.warn("[notify] Telegram error:", r.status, body.slice(0, 200));
      return { ok: false, error: `HTTP_${r.status}` };
    }
    console.log("[notify] Telegram ✓ sent");
    return { ok: true };
  } catch (e) {
    console.warn("[notify] Telegram failed:", (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}

function buildTelegramMessage(l: LeadPayload): string {
  const days = Math.max(1, Math.ceil(
    (new Date(l.dateTo).getTime() - new Date(l.dateFrom).getTime()) / 86400000,
  ));
  const tariff = l.nochevkaHours ? ` (тариф ${l.nochevkaHours} ч)` : "";
  const service = l.service === "parking" ? "🅿️ Парковка" : `🛏️ Ночёвка${tariff}`;
  const utm = l.utm && Object.keys(l.utm).length
    ? "\n<b>UTM:</b> <code>" + Object.entries(l.utm).map(([k, v]) => `${k}=${v}`).join(" ") + "</code>"
    : "";
  const car = l.carNumber ? `\n<b>Авто:</b> ${l.carNumber}` : "";
  const notes = l.notes ? `\n<b>Комментарий:</b> ${l.notes}` : "";

  return `🚀 <b>Новая заявка</b>

<b>Услуга:</b> ${service}
<b>Имя:</b> ${l.name}
<b>Телефон:</b> <code>${l.phone}</code>
<b>Даты:</b> ${l.dateFrom} → ${l.dateTo} (${days} ${days === 1 ? "сутки" : days < 5 ? "суток" : "суток"})
<b>Расчёт:</b> ${l.price ? `${l.price.toLocaleString("ru")} ₽` : "—"}${car}${notes}
<b>Источник:</b> ${l.source ?? "web"}${utm}

⏰ ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК`;
}

/* ---------- Email ---------- */

let _transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function getTransporter() {
  if (_transporter) return _transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

export async function notifyEmail(lead: LeadPayload): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    console.log("[notify] Email skip — SMTP not configured");
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  try {
    const days = Math.max(1, Math.ceil(
      (new Date(lead.dateTo).getTime() - new Date(lead.dateFrom).getTime()) / 86400000,
    ));
    const service = lead.service === "parking" ? "Парковка" : "Ночёвка";

    await t.sendMail({
      from: SMTP_FROM,
      to: SMTP_TO,
      subject: `🚀 Новая заявка: ${lead.name} · ${lead.phone}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:560px;color:#1a1d24">
        <h2 style="color:#0f4d47;margin:0 0 16px">Новая заявка с сайта</h2>
        <table cellpadding="8" style="border-collapse:collapse;width:100%;font-size:14px">
          <tr><td><b>Имя</b></td><td>${escapeHtml(lead.name)}</td></tr>
          <tr><td><b>Телефон</b></td><td><a href="tel:${lead.phone}">${escapeHtml(lead.phone)}</a></td></tr>
          <tr><td><b>Услуга</b></td><td>${service}</td></tr>
          <tr><td><b>Даты</b></td><td>${lead.dateFrom} → ${lead.dateTo} (${days} ${days === 1 ? "сутки" : "суток"})</td></tr>
          <tr><td><b>Цена</b></td><td>${lead.price ? lead.price.toLocaleString("ru") + " ₽" : "—"}</td></tr>
          ${lead.carNumber ? `<tr><td><b>Авто</b></td><td>${escapeHtml(lead.carNumber)}</td></tr>` : ""}
          ${lead.notes ? `<tr><td><b>Комментарий</b></td><td>${escapeHtml(lead.notes)}</td></tr>` : ""}
          <tr><td><b>Источник</b></td><td>${escapeHtml(lead.source ?? "web")}</td></tr>
        </table>
        <p style="color:#8a8f9f;font-size:12px;margin-top:24px">
          Время: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК
        </p>
      </div>`,
      text: `Новая заявка\nИмя: ${lead.name}\nТелефон: ${lead.phone}\nУслуга: ${service}\nДаты: ${lead.dateFrom} → ${lead.dateTo}\nЦена: ${lead.price ?? "—"}\nИсточник: ${lead.source ?? "web"}`,
    });
    console.log("[notify] Email ✓ sent to", SMTP_TO);
    return { ok: true };
  } catch (e) {
    console.warn("[notify] Email failed:", (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
