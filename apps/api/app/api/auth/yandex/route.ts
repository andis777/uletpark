import { NextResponse } from "next/server";
import { z } from "zod";
import { signAccessToken, signRefreshToken } from "@/lib/auth";
import { exchangeYandexCode, fetchYandexProfile, isYandexConfigured } from "@/lib/yandex";
import { loginWithYandexProfile } from "@/lib/yandex-login";
import { setClientCookie } from "@/lib/cabinet-auth";

/**
 * Вход через Яндекс ID для мобильного приложения.
 *
 * Приложение получает authorization code (expo-auth-session, PKCE) и присылает
 * его сюда. Обмен кода на токен делает СЕРВЕР — client_secret в приложение не попадает.
 */

const Body = z.object({
  code: z.string().min(1),
  codeVerifier: z.string().optional(),   // PKCE
  redirectUri: z.string().optional(),    // должен совпадать с тем, что был при запросе кода
  web: z.boolean().optional(),           // true — дополнительно поставить cookie кабинета
});

export async function POST(req: Request) {
  if (!isYandexConfigured()) {
    return NextResponse.json({ error: "YANDEX_NOT_CONFIGURED" }, { status: 503 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const exchanged = await exchangeYandexCode({
    code: parsed.data.code,
    codeVerifier: parsed.data.codeVerifier,
    redirectUri: parsed.data.redirectUri,
  });
  if (!exchanged.ok) {
    return NextResponse.json({ error: "YANDEX_EXCHANGE_FAILED", detail: exchanged.error }, { status: 401 });
  }

  const prof = await fetchYandexProfile(exchanged.accessToken);
  if (!prof.ok) {
    return NextResponse.json({ error: "YANDEX_PROFILE_FAILED", detail: prof.error }, { status: 401 });
  }

  const { user, isNewUser, linkedBookings } = await loginWithYandexProfile(prof.profile);

  const claims = {
    sub: user.id,
    ...(user.phone ? { phone: user.phone } : {}),
    ...(user.email ? { email: user.email } : {}),
  };
  const accessToken = await signAccessToken(claims);
  const refreshToken = await signRefreshToken(claims);

  if (parsed.data.web) await setClientCookie(accessToken);

  console.log(`[auth/yandex] вход, user ${user.id}${isNewUser ? " (новый)" : ""}`);

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
    needsPhone: !user.phone,
    linkedBookings,
  });
}
