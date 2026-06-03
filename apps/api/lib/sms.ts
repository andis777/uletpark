/**
 * SMS provider — SMS.ru
 * https://sms.ru/api/send
 *
 * STUB-режим: если SMSRU_API_ID === 'stub' (или пустой) — пишет в console.log.
 * Идеально для разработки.
 */

interface SmsResult { success: boolean; smsId?: string; error?: string; }

/** True если API ID отсутствует, "stub", или похож на placeholder из шаблона .env.example */
export function isStubSms(apiId: string | undefined): boolean {
  if (!apiId) return true;
  if (apiId === "stub") return true;
  if (process.env.SMS_PROVIDER === "stub") return true;
  // sms.ru ID — GUID xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 символов)
  // Если короче 30 — точно не реальный ID
  if (apiId.length < 30) return true;
  // Шаблонные значения из .env.example
  if (/^(ваш|your|change|placeholder|example|todo|fixme)/i.test(apiId)) return true;
  return false;
}

export async function sendSms(phone: string, text: string): Promise<SmsResult> {
  const apiId = process.env.SMSRU_API_ID;

  if (isStubSms(apiId)) {
    console.log(`📱 [SMS STUB] → ${phone}: ${text}`);
    return { success: true, smsId: "stub-" + Date.now() };
  }

  const url = new URL("https://sms.ru/sms/send");
  url.searchParams.set("api_id", apiId);
  url.searchParams.set("to", phone.replace(/\D/g, ""));
  url.searchParams.set("msg", text);
  url.searchParams.set("json", "1");
  if (process.env.SMSRU_FROM) url.searchParams.set("from", process.env.SMSRU_FROM);

  try {
    const res = await fetch(url, { method: "POST" });
    const data = await res.json() as { status: string; sms?: Record<string, { sms_id?: string; status_text?: string }> };
    if (data.status !== "OK") return { success: false, error: data.status };
    const phoneKey = Object.keys(data.sms ?? {})[0];
    const smsId = data.sms?.[phoneKey]?.sms_id;
    return { success: true, smsId };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function sendOtp(phone: string, code: string) {
  return sendSms(phone, `Улётная парковка: код подтверждения ${code}`);
}
