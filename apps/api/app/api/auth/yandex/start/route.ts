import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { YANDEX_AUTHORIZE_URL, YANDEX_CLIENT_ID, isYandexConfigured } from "@/lib/yandex";

/**
 * Старт входа через Яндекс для веб-кабинета: редиректим пользователя на Яндекс.
 * state кладём в короткоживущую httpOnly cookie и сверяем на возврате — защита от CSRF.
 */
export const dynamic = "force-dynamic";

export const STATE_COOKIE = "yandex_state";

export async function GET(req: Request) {
  if (!isYandexConfigured()) {
    return NextResponse.redirect(new URL("/cabinet/login?error=yandex_off", req.url));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/auth/yandex/callback", req.url).toString();

  const c = await cookies();
  c.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });

  const url = new URL(YANDEX_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", YANDEX_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
