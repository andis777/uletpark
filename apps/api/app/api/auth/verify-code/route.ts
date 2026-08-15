import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gt, isNull, desc } from "drizzle-orm";
import { db, otpCodes, users } from "@/lib/db";
import {
  normalizeEmail,
  normalizePhone,
  signAccessToken,
  signRefreshToken,
  verifyOtp,
} from "@/lib/auth";
import { findOrCreateContactByPhone } from "@/lib/amocrm";
import { linkBookingsToUserByPhone } from "@/lib/sync-amocrm";

/**
 * Проверка кода входа (e-mail или телефон) и выдача токенов.
 * Старый /auth/verify-otp продолжает работать — его не трогаем.
 */

const Body = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    code: z.string().length(6),
  })
  .refine((b) => Boolean(b.email || b.phone), { message: "email or phone required" });

const APP_REVIEW_DEMO_PHONES = new Set(["+79991234567", "+79991110000", "+79991110001"]);
const APP_REVIEW_DEMO_EMAILS = new Set(["appreview@uletnayaparkovka.ru"]);
const APP_REVIEW_DEMO_CODE = "111111";

function newReferralCode() {
  return `UP${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

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
  const isDemo =
    (channel === "sms" && APP_REVIEW_DEMO_PHONES.has(identifier)) ||
    (channel === "email" && APP_REVIEW_DEMO_EMAILS.has(identifier));

  if (!isDemo) {
    const [otp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.identifier, identifier),
          isNull(otpCodes.consumedAt),
          gt(otpCodes.expiresAt, new Date())
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!otp) return NextResponse.json({ error: "CODE_NOT_FOUND_OR_EXPIRED" }, { status: 401 });
    if (otp.attempts >= 5) return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 429 });

    const ok = await verifyOtp(parsed.data.code, otp.codeHash);
    if (!ok) {
      await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
      return NextResponse.json({ error: "INVALID_CODE" }, { status: 401 });
    }
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));
  } else if (parsed.data.code !== APP_REVIEW_DEMO_CODE) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 401 });
  }

  // --- Найти или создать пользователя ---
  let user;
  let isNewUser = false;

  if (channel === "email") {
    [user] = await db.select().from(users).where(eq(users.email, identifier)).limit(1);
    if (!user) {
      isNewUser = true;
      // Телефона пока нет — amoCRM-контакт не создаём, он появится при первой брони.
      [user] = await db
        .insert(users)
        .values({
          email: identifier,
          emailVerifiedAt: new Date(),
          referralCode: newReferralCode(),
        })
        .returning();
    } else if (!user.emailVerifiedAt) {
      // Почта уже была в профиле (например, указана при брони) — теперь она подтверждена входом.
      [user] = await db
        .update(users)
        .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
    }
  } else {
    [user] = await db.select().from(users).where(eq(users.phone, identifier)).limit(1);
    if (!user) {
      isNewUser = true;
      const contact = isDemo
        ? { id: null as number | null, name: "App Review Demo" }
        : await findOrCreateContactByPhone(identifier);
      [user] = await db
        .insert(users)
        .values({
          phone: identifier,
          amocrmContactId: contact.id,
          firstName: contact.name?.trim().split(" ")[0] || null,
          referralCode: newReferralCode(),
        })
        .returning();
    }
  }

  // Подтянуть прошлые сделки из amoCRM — только если телефон известен.
  let linkedBookings = 0;
  if (user.phone) {
    try {
      const result = await linkBookingsToUserByPhone(user.id, user.phone);
      linkedBookings = result.linked;
    } catch (e) {
      console.error("[verify-code] linkBookingsToUserByPhone failed:", e);
    }
  }

  const claims = {
    sub: user.id,
    ...(user.phone ? { phone: user.phone } : {}),
    ...(user.email ? { email: user.email } : {}),
  };
  const accessToken = await signAccessToken(claims);
  const refreshToken = await signRefreshToken(claims);

  console.log(`[verify-code] вход через ${channel}, user ${user.id}${isNewUser ? " (новый)" : ""}`);

  return NextResponse.json({
    accessToken,
    refreshToken,
    expiresIn: 60 * 60 * 24 * 30,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      firstName: user.firstName,
      loyaltyTier: user.loyaltyTier,
      loyaltyPoints: user.loyaltyPoints,
    },
    isNewUser,
    // Телефон нужен для брони (amoCRM + трансфер) — приложение попросит его на первой броне.
    needsPhone: !user.phone,
    linkedBookings,
  });
}
