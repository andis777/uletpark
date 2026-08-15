/**
 * Сессия личного кабинета клиента — httpOnly cookie с тем же JWT,
 * что выдаёт мобильное приложение (см. lib/auth.ts).
 *
 * Сделано по образцу lib/admin-auth.ts, но это ДРУГАЯ сессия:
 * cookie `client_session` и токен пользователя, а не администратора.
 * Так кабинет и админка не пересекаются, даже если открыты в одном браузере.
 */

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, users } from "@uletnaya/db";
import { verifyToken, type JwtPayload } from "./auth";

export const CLIENT_COOKIE = "client_session";

/** Кладём уже подписанный access-токен пользователя в httpOnly cookie. */
export async function setClientCookie(accessToken: string) {
  const c = await cookies();
  c.set(CLIENT_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,   // как срок жизни access-токена
    path: "/",
  });
}

export async function clearClientCookie() {
  const c = await cookies();
  c.delete(CLIENT_COOKIE);
}

/** Разбирает cookie. null — если её нет, она битая или это не access-токен. */
export async function getClientFromCookie(): Promise<JwtPayload | null> {
  const c = await cookies();
  const tok = c.get(CLIENT_COOKIE)?.value;
  if (!tok) return null;
  const payload = await verifyToken(tok);
  if (payload?.type !== "access") return null;
  return payload;
}

/** Текущий клиент из БД — или null, если сессии нет / пользователя удалили. */
export async function getCurrentClient() {
  const session = await getClientFromCookie();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.sub)).limit(1);
  return user ?? null;
}
