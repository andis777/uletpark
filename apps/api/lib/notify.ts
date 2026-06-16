/**
 * Уведомления о новых лидах — Telegram + Email.
 * Все секреты приходят из ENV. Если значений нет — соответствующий канал тихо
 * пропускается (полезно для STUB-режима).
 */

import nodemailer from "nodemailer";

const TG_BOT = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

// Дефолт — наш собственный Exim в docker-compose сервисе "mailer:25"
// (без аутентификации, доверенная сеть внутри docker). Внешний SMTP можно
// переопределить через env. Когда SMTP_HOST=mailer — auth не используется.
const SMTP_HOST = process.env.SMTP_HOST || "mailer";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? (process.env.SMTP_HOST ? 465 : 25));
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? "Улётная Парковка <noreply@uletnayaparkovka.ru>";
const SMTP_TO = process.env.SMTP_TO ?? "uletnayaparkovka@gmail.com";
const SMTP_SECURE = (process.env.SMTP_SECURE ?? (SMTP_PORT === 465 ? "true" : "false")) === "true";

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
  // Если SMTP_HOST не задан явно — используем встроенный Exim "mailer:25" без auth.
  // Если задан внешний SMTP — требуем USER+PASS.
  const useInternalExim = !process.env.SMTP_HOST;
  if (!useInternalExim && (!SMTP_USER || !SMTP_PASS)) return null;
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: useInternalExim ? undefined : { user: SMTP_USER!, pass: SMTP_PASS! },
    // Внутренний Exim не требует TLS и не имеет валидного сертификата
    tls: useInternalExim ? { rejectUnauthorized: false } : undefined,
    // Внутри docker network — быстрые таймауты
    connectionTimeout: useInternalExim ? 5000 : 30000,
    socketTimeout: useInternalExim ? 10000 : 60000,
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

/**
 * Email-подтверждение клиенту после успешной заявки.
 * Шлётся только если в LeadPayload есть email (новое опциональное поле).
 */
export async function notifyClient(lead: LeadPayload & { email?: string }): Promise<{ ok: boolean; error?: string }> {
  if (!lead.email) return { ok: false, error: "NO_EMAIL" };
  const t = getTransporter();
  if (!t) return { ok: false, error: "NOT_CONFIGURED" };

  try {
    const days = Math.max(1, Math.ceil(
      (new Date(lead.dateTo).getTime() - new Date(lead.dateFrom).getTime()) / 86400000,
    ));
    const service = lead.service === "parking" ? "Парковка у Шереметьево" : "Улётная Ночёвка";
    const tariff = lead.nochevkaHours ? ` (тариф ${lead.nochevkaHours} ч)` : "";

    await t.sendMail({
      from: SMTP_FROM,
      to: lead.email,
      subject: `Заявка принята — ${service}, ${lead.dateFrom}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:560px;color:#1a1d24;line-height:1.55">
        <div style="background:linear-gradient(135deg,#0f1419,#0f4d47);color:#fff;padding:32px 24px;border-radius:16px 16px 0 0">
          <div style="color:#3FB8AF;font-size:11px;font-weight:700;letter-spacing:3px;margin-bottom:8px">✈ УЛЁТНАЯ ПАРКОВКА</div>
          <h1 style="margin:0;font-weight:300;font-size:28px;letter-spacing:-0.5px">Заявка принята</h1>
          <p style="margin:8px 0 0;opacity:0.85;font-size:14px">Менеджер перезвонит в течение 5 минут</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px">
          <h2 style="margin:0 0 16px;color:#0f4d47;font-size:18px">Здравствуйте, ${escapeHtml(lead.name)}!</h2>
          <p>Спасибо за выбор Улётной Парковки. Мы получили вашу заявку — менеджер свяжется по телефону <b>${escapeHtml(lead.phone)}</b> для подтверждения.</p>

          <table cellpadding="10" style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;background:#f6f8f8;border-radius:10px;overflow:hidden">
            <tr><td><b>Услуга:</b></td><td>${service}${tariff}</td></tr>
            <tr><td><b>Заезд:</b></td><td>${lead.dateFrom}</td></tr>
            <tr><td><b>Выезд:</b></td><td>${lead.dateTo} (${days} ${days === 1 ? "сутки" : "суток"})</td></tr>
            <tr><td><b>Стоимость:</b></td><td style="font-size:18px;color:#0f4d47;font-weight:700">${lead.price ? lead.price.toLocaleString("ru") + " ₽" : "уточним при звонке"}</td></tr>
          </table>

          <div style="background:rgba(63,184,175,0.08);border-left:4px solid #3FB8AF;padding:14px 18px;border-radius:8px;font-size:13px;margin:16px 0">
            <b style="color:#0f4d47">Что включено в стоимость:</b><br>
            ✓ Бесплатный трансфер 24/7 туда-обратно<br>
            ✓ Охрана + видеонаблюдение<br>
            ✓ Договор хранения<br>
            ✓ До 2 часов бесплатно при задержке рейса<br>
            ✓ Зал ожидания, Wi-Fi
          </div>

          <p style="margin:20px 0 8px"><b>Адрес:</b> Московская обл., г.о. Химки, с. Чашниково</p>
          <p style="margin:0 0 20px"><b>Телефон:</b> <a href="tel:+79099148881" style="color:#0f4d47">+7 (909) 914-88-81</a></p>

          <div style="text-align:center;margin:24px 0">
            <a href="https://www.rustore.ru/catalog/app/com.uletnayaparkovka.app" style="background:#3FB8AF;color:#fff;padding:14px 26px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;font-size:14px">📱 Скачать наше приложение</a>
            <p style="font-size:12px;color:#8a8f9f;margin-top:8px">Управляйте бронями, копите бонусы (1₽=1балл), приглашайте друзей</p>
          </div>

          <p style="color:#8a8f9f;font-size:11px;text-align:center;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
            10 лет работаем · 4.9★ на Яндекс.Картах · ОГРН 316774600421050<br>
            Это автоматическое письмо. На него можно не отвечать. Менеджер перезвонит сам.
          </p>
        </div>
      </div>`,
      text: `Здравствуйте, ${lead.name}!\n\nЗаявка принята. Менеджер перезвонит в течение 5 минут по ${lead.phone}.\n\nУслуга: ${service}${tariff}\nДаты: ${lead.dateFrom} → ${lead.dateTo} (${days} суток)\nСтоимость: ${lead.price ? lead.price + " ₽" : "уточним при звонке"}\n\nАдрес: Московская обл., Химки, с. Чашниково\nТелефон: +7 (909) 914-88-81\n\nСкачайте приложение: https://www.rustore.ru/catalog/app/com.uletnayaparkovka.app\n\nУлётная Парковка · 10 лет работаем`,
    });
    console.log("[notify] Client email ✓ sent to", lead.email);
    return { ok: true };
  } catch (e) {
    console.warn("[notify] Client email failed:", (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
