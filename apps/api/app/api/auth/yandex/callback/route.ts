import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signAccessToken } from "@/lib/auth";
import { exchangeYandexCode, fetchYandexProfile, isYandexConfigured } from "@/lib/yandex";
import { loginWithYandexProfile } from "@/lib/yandex-login";
import { setClientCookie } from "@/lib/cabinet-auth";
import { STATE_COOKIE } from "../start/route";

/** Возврат от Яндекса для веб-кабинета: проверяем state, логиним, ставим сессию. */
export const dynamic = "force-dynamic";

function fail(req: Request, reason: string) {
  return NextResponse.redirect(new URL(`/cabinet/login?error=${reason}`, req.url));
}

export async function GET(req: Request) {
  if (!isYandexConfigured()) return fail(req, "yandex_off");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error") || !code) return fail(req, "denied");

  // CSRF: state обязан совпасть с тем, что мы положили в cookie на старте.
  const c = await cookies();
  const expected = c.get(STATE_COOKIE)?.value;
  c.delete(STATE_COOKIE);
  if (!expected || !state || state !== expected) return fail(req, "state");

  const redirectUri = new URL("/api/auth/yandex/callback", req.url).toString();
  const exchanged = await exchangeYandexCode({ code, redirectUri });
  if (!exchanged.ok) return fail(req, "exchange");

  const prof = await fetchYandexProfile(exchanged.accessToken);
  if (!prof.ok) return fail(req, "profile");

  const { user, isNewUser } = await loginWithYandexProfile(prof.profile);

  const accessToken = await signAccessToken({
    sub: user.id,
    ...(user.phone ? { phone: user.phone } : {}),
    ...(user.email ? { email: user.email } : {}),
  });
  await setClientCookie(accessToken);

  console.log(`[auth/yandex/callback] вход в кабинет, user ${user.id}${isNewUser ? " (новый)" : ""}`);
  return NextResponse.redirect(new URL("/cabinet", req.url));
}
