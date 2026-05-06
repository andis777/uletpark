import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gt, isNull, desc } from "drizzle-orm";
import { db, otpCodes, users } from "@/lib/db";
import { normalizePhone, signAccessToken, signRefreshToken, verifyOtp } from "@/lib/auth";
import { findOrCreateContactByPhone } from "@/lib/amocrm";
import { linkBookingsToUserByPhone } from "@/lib/sync-amocrm";

const Body = z.object({ phone: z.string(), code: z.string().length(6) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const phone = normalizePhone(body.data.phone);
  if (!phone) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

  // Берём свежий неиспользованный код
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!otp) return NextResponse.json({ error: "OTP_NOT_FOUND_OR_EXPIRED" }, { status: 401 });
  if (otp.attempts >= 5) return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });

  const ok = await verifyOtp(body.data.code, otp.codeHash);
  if (!ok) {
    await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 401 });
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));

  // Найти или создать пользователя
  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    // amoCRM contact (либо существующий, либо новый)
    const contact = await findOrCreateContactByPhone(phone);
    [user] = await db
      .insert(users)
      .values({
        phone,
        amocrmContactId: contact.id,
        firstName: contact.name?.trim().split(" ")[0] || null,   // пустое → null (UI покажет "Гость")
        referralCode: `UP${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      })
      .returning();
  }

  // Авто-линковка существующих сделок amoCRM по этому телефону.
  // Делаем для нового юзера или если у существующего ещё нет привязанных броней.
  // Не блокируем ответ — гоним в фоне, ответ должен быть быстрым.
  let linkedBookings = 0;
  try {
    const result = await linkBookingsToUserByPhone(user.id, phone);
    linkedBookings = result.linked;
  } catch (e) {
    console.error("linkBookingsToUserByPhone failed:", e);
  }

  const accessToken = await signAccessToken({ sub: user.id, phone });
  const refreshToken = await signRefreshToken({ sub: user.id, phone });

  return NextResponse.json({
    accessToken,
    refreshToken,
    expiresIn: 60 * 60 * 24 * 30,
    user: {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
    isNewUser,
    linkedBookings,
  });
}
