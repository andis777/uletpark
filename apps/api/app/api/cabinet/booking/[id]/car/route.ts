import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, bookings } from "@/lib/db";
import { getCurrentClient } from "@/lib/cabinet-auth";

export const dynamic = "force-dynamic";

const Body = z.object({
  carNumber: z.string().trim().max(20).optional(),
  carModel: z.string().trim().max(60).optional(),
});

/**
 * Правка автомобиля в своей броне.
 *
 * Здесь меняем сразу, без подтверждения: номер и модель — данные клиента,
 * на цену они не влияют, а неверный номер создаёт трение на въезде.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentClient();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const { carNumber, carModel } = parsed.data;
  if (carNumber === undefined && carModel === undefined) {
    return NextResponse.json({ error: "NOTHING_TO_UPDATE" }, { status: 400 });
  }

  const [b] = await db
    .select({ id: bookings.id, status: bookings.status })
    .from(bookings)
    .where(and(eq(bookings.id, id), eq(bookings.userId, user.id)))
    .limit(1);
  if (!b) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (b.status === "cancelled" || b.status === "completed") {
    return NextResponse.json({ error: "BOOKING_CLOSED" }, { status: 409 });
  }

  const [upd] = await db
    .update(bookings)
    .set({
      ...(carNumber !== undefined ? { carNumber: carNumber || null } : {}),
      ...(carModel !== undefined ? { carModel: carModel || null } : {}),
      updatedAt: sql`NOW()`,
    })
    .where(eq(bookings.id, b.id))
    .returning({ carNumber: bookings.carNumber, carModel: bookings.carModel });

  return NextResponse.json({ ok: true, carNumber: upd.carNumber, carModel: upd.carModel });
}
