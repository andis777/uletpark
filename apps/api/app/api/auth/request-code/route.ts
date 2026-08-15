import { NextResponse } from "next/server";
import { z } from "zod";
import { db, otpCodes } from "@/lib/db";
import { generateEmailCode, generateOtp, hashOtp, normalizeEmail, normalizePhone } from "@/lib/auth";
import { sendOtp, isStubSms } from "@/lib/sms";
import { sendLoginCode } from "@/lib/notify";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Универсальный запрос кода входа: по e-mail (основной канал) или по телефону.
 *
 * Почему появился: SMS у нас и дорогие, и по факту не доходят — отправитель
 * не подключён у части операторов, поэтому люди просто не получают код.
 * Почта бесплатна и доставляется.
 *
 * Старые /auth/request-otp и /auth/verify-otp намеренно оставлены рабочими,
 * чтобы уже установленные сборки приложения продолжали логиниться.
 */

const Body = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine((b) => Boolean(b.email || b.phone), { message: "email or phone required" });

const CODE_TTL_MIN = 15;

/** Демо-аккаунты для модерации сторов — код не отправляется (см. verify-code). */
const APP_REVIEW_DEMO_PHONES = new Set(["+79991234567", "+79991110000", "+79991110001"]);
const APP_REVIEW_DEMO_EMAILS = new Set(["appreview@uletnayaparkovka.ru"]);

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const wantsEmail = Boolean(parsed.data.email);
  const identifier = wantsEmail
    ? normalizeEmail(parsed.data.email!)
    : normalizePhone(parsed.data.phone!);

  if (!identifier) {
    return NextResponse.json(
      { error: wantsEmail ? "INVALID_EMAIL" : "INVALID_PHONE" },
      { status: 400 }
    );
  }

  const channel: "email" | "sms" = wantsEmail ? "email" : "sms";

  // Демо-аккаунты: код не шлём, verify-code примет фиксированный.
  if (
    (channel === "sms" && APP_REVIEW_DEMO_PHONES.has(identifier)) ||
    (channel === "email" && APP_REVIEW_DEMO_EMAILS.has(identifier))
  ) {
    return NextResponse.json({ ok: true, channel, expiresIn: CODE_TTL_MIN * 60 });
  }

  // Лимиты: на адрес/телефон и на IP. Для SMS в STUB-режиме — мягче.
  const isStub = channel === "sms" && isStubSms(process.env.SMSRU_API_ID);
  const maxPerId = isStub ? 50 : 5;
  const maxPerIp = isStub ? 200 : 15;
  const ip = getClientIp(req);
  const idLimit = await checkRateLimit(`code:${channel}:${identifier}`, maxPerId, 10 * 60_000);
  if (!idLimit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  const ipLimit = await checkRateLimit(`code:ip:${ip}`, maxPerIp, 10 * 60_000);
  if (!ipLimit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const code = channel === "email" ? generateEmailCode() : generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);

  await db.insert(otpCodes).values({
    identifier,
    channel,
    // phone заполняем только для SMS — чтобы старый /auth/verify-otp продолжал находить код
    phone: channel === "sms" ? identifier : null,
    codeHash,
    expiresAt,
  });

  if (channel === "email") {
    const mail = await sendLoginCode(identifier, code);
    if (!mail.ok) {
      // Код уже в БД; наружу отдаём понятную ошибку, чтобы приложение показало текст.
      console.warn("[request-code] отправка письма не удалась:", mail.error);
      return NextResponse.json({ error: "EMAIL_SEND_FAILED" }, { status: 502 });
    }
  } else {
    const sms = await sendOtp(identifier, code);
    if (!sms.success && !isStub) {
      return NextResponse.json({ error: "SMS_SEND_FAILED" }, { status: 502 });
    }
  }

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({
    ok: true,
    channel,
    expiresIn: CODE_TTL_MIN * 60,
    ...(isDev ? { devCode: code } : {}),
  });
}
