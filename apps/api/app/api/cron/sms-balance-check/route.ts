/**
 * Cron: проверка баланса sms.ru.
 * Запускается раз в сутки.
 * Если баланс < ALERT_THRESHOLD — пишет ERROR в лог и отправляет SMS-уведомление админу.
 */
import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sms";

const ALERT_THRESHOLD = 100; // ₽
const CRITICAL_THRESHOLD = 30; // ₽ — отправить SMS админу

export async function GET(req: Request) {
  // Авторизация cron'а
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiId = process.env.SMSRU_API_ID;
  if (!apiId || apiId === "stub") {
    return NextResponse.json({ ok: true, skipped: "sms_provider_disabled" });
  }

  const adminPhone = process.env.ADMIN_PHONE; // например +79991234567 — куда слать алерт

  let balance = 0;
  try {
    const res = await fetch(`https://sms.ru/my/balance?api_id=${apiId}&json=1`, {
      cache: "no-store",
    });
    const data = (await res.json()) as { status: string; balance?: number };
    if (data.status !== "OK") {
      console.error(`[sms-balance] sms.ru API error: ${data.status}`);
      return NextResponse.json({ error: "sms_ru_api_error", detail: data.status }, { status: 502 });
    }
    balance = data.balance ?? 0;
  } catch (e) {
    console.error(`[sms-balance] fetch failed:`, e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }

  const level = balance < CRITICAL_THRESHOLD ? "CRITICAL" : balance < ALERT_THRESHOLD ? "WARN" : "OK";
  const msg = `[sms-balance] balance=${balance.toFixed(2)}₽ level=${level} threshold_warn=${ALERT_THRESHOLD} threshold_crit=${CRITICAL_THRESHOLD}`;

  if (level === "CRITICAL") {
    console.error(msg);
    // Шлём SMS админу пока ещё есть деньги
    if (adminPhone) {
      try {
        await sendSms(adminPhone, `Улётная парковка: баланс sms.ru ${balance}₽, ПОПОЛНИ срочно sms.ru`);
        console.log(`[sms-balance] admin notified: ${adminPhone}`);
      } catch (e) {
        console.error(`[sms-balance] admin notify failed:`, e);
      }
    }
  } else if (level === "WARN") {
    console.warn(msg);
  } else {
    console.log(msg);
  }

  return NextResponse.json({ ok: true, balance, level, alertThreshold: ALERT_THRESHOLD, criticalThreshold: CRITICAL_THRESHOLD });
}
