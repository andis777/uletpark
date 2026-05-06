import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import { getUserFromHeader } from "@/lib/auth";
import { linkBookingsToUserByPhone } from "@/lib/sync-amocrm";

/**
 * POST /api/bookings/sync-mine
 * Тянет все лиды текущего юзера из amoCRM по его телефону,
 * upsert в bookings + проставляет user_id.
 *
 * Идемпотентно (повторный вызов не задвоит). Без побочных эффектов в amoCRM.
 */
export async function POST(req: Request) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  try {
    const result = await linkBookingsToUserByPhone(user.id, user.phone);
    return NextResponse.json({
      ok: true,
      linkedBookings: result.linked,
      phone: user.phone,
    });
  } catch (e) {
    console.error("[sync-mine] failed:", e);
    return NextResponse.json({
      error: "SYNC_FAILED",
      message: (e as Error).message,
    }, { status: 502 });
  }
}
