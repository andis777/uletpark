import { NextResponse } from "next/server";
import { clearClientCookie } from "@/lib/cabinet-auth";

/** Выход из личного кабинета — просто снимаем httpOnly cookie сессии. */
export async function POST() {
  await clearClientCookie();
  return NextResponse.json({ ok: true });
}
