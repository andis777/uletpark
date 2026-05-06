import { NextResponse } from "next/server";
import { z } from "zod";
import { db, otpCodes } from "@/lib/db";
import { generateOtp, hashOtp, normalizePhone } from "@/lib/auth";
import { sendOtp } from "@/lib/sms";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const Body = z.object({ phone: z.string().min(10) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

  const phone = normalizePhone(body.data.phone);
  if (!phone) return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });

  // Rate limits: в STUB-режиме мягкие, в проде строгие
  const isStub = process.env.SMS_PROVIDER === "stub" || !process.env.SMSRU_API_ID;
  const maxPerPhone = isStub ? 50 : 3;
  const maxPerIp = isStub ? 200 : 10;
  const ip = getClientIp(req);
  const phoneLimit = await checkRateLimit(`otp:phone:${phone}`, maxPerPhone, 10 * 60_000);
  if (!phoneLimit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  const ipLimit = await checkRateLimit(`otp:ip:${ip}`, maxPerIp, 10 * 60_000);
  if (!ipLimit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(otpCodes).values({ phone, codeHash, expiresAt });

  const sms = await sendOtp(phone, code);
  if (!sms.success) return NextResponse.json({ error: "SMS_SEND_FAILED" }, { status: 502 });

  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({
    ok: true,
    expiresIn: 300,
    devCode: isDev ? code : undefined,
  });
}
