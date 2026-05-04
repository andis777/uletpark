/**
 * Admin auth — простая email/password сессия в httpOnly cookie.
 * Для Phase 3 — достаточно. В Phase 5 заменим на Better-Auth + Google SSO.
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, admins } from "@uletnaya/db";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "DEV_SECRET_DO_NOT_USE_IN_PROD_64chars_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
);

export const COOKIE_NAME = "admin_session";

export interface AdminSession {
  sub: string;
  email: string;
  role: string;
}

export async function signAdminSession(s: AdminSession) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyAdminSession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AdminSession;
  } catch { return null; }
}

export async function getAdminFromCookie(): Promise<AdminSession | null> {
  const c = await cookies();
  const tok = c.get(COOKIE_NAME)?.value;
  if (!tok) return null;
  return verifyAdminSession(tok);
}

export async function requireAdmin(): Promise<AdminSession> {
  const a = await getAdminFromCookie();
  if (!a) throw new Error("UNAUTHORIZED");
  return a;
}

export async function loginAdmin(email: string, password: string): Promise<AdminSession | null> {
  const [a] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (!a || !a.passwordHash) return null;
  const ok = await bcrypt.compare(password, a.passwordHash);
  if (!ok) return null;
  return { sub: a.id, email: a.email, role: a.role };
}

export async function setAdminCookie(session: AdminSession) {
  const token = await signAdminSession(session);
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAdminCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
