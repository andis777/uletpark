import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { isStubSms } from "./sms";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "DEV_SECRET_DO_NOT_USE_IN_PROD_64_chars_xxxxxxxxxxxxxxxxxxxxxxxx"
);

export interface JwtPayload {
  sub: string;          // user id
  phone?: string;       // может отсутствовать: регистрация по e-mail без телефона
  email?: string;
  type: "access" | "refresh";
}

export async function signAccessToken(payload: Omit<JwtPayload, "type">) {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function signRefreshToken(payload: Omit<JwtPayload, "type">) {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function getUserFromHeader(authHeader: string | null): Promise<JwtPayload | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (payload?.type !== "access") return null;
  return payload;
}

/* --- OTP --- */

export function generateOtp(): string {
  // В STUB-режиме SMS.ru (включая placeholder из .env.example) — фиксированный "111111".
  // На проде с боевым 36-символьным GUID — случайный 6-значный.
  if (isStubSms(process.env.SMSRU_API_ID)) {
    return "111111";
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Код для входа по e-mail. Всегда случайный: заглушка "111111" из generateOtp()
 * привязана к STUB-режиму SMS.ru и к почте отношения не имеет.
 * В dev код возвращается в ответе (devCode), так что фиксированный не нужен.
 */
export function generateEmailCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* --- Email normalization --- */

/** Нормализует e-mail: обрезает пробелы и приводит к нижнему регистру. null — если формат неверный. */
export function normalizeEmail(input: string): string | null {
  const email = input.trim().toLowerCase();
  // Намеренно простая проверка: строгие regex отсекают валидные адреса.
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return null;
  return email;
}

/* --- Phone normalization --- */

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return "+7" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("7")) return "+" + digits;
  if (digits.length === 10) return "+7" + digits;
  return null;
}
