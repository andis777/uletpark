import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users, bookings, loyaltyTransactions } from "@/lib/db";
import { getUserFromHeader } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const [u] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  if (!u) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    user: {
      id: u.id,
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      loyaltyTier: u.loyaltyTier,
      loyaltyPoints: u.loyaltyPoints,
      referralCode: u.referralCode,
    },
  });
}

const PatchBody = z.object({
  firstName: z.string().min(1).max(64).optional(),
  lastName: z.string().max(64).optional(),
  email: z.string().email().optional(),
  pushToken: z.string().max(256).optional(),
});

export async function PATCH(req: Request) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = PatchBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_BODY", issues: body.error.issues }, { status: 400 });

  const [updated] = await db
    .update(users)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(users.id, auth.sub))
    .returning();

  return NextResponse.json({
    user: {
      id: updated.id,
      phone: updated.phone,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      loyaltyTier: updated.loyaltyTier,
      loyaltyPoints: updated.loyaltyPoints,
    },
  });
}

/**
 * Account deletion — required by App Store guideline 5.1.1(v).
 * Удаляет пользователя и все связанные данные. Активные брони отменяются.
 */
export async function DELETE(req: Request) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  console.log(`[me/DELETE] user ${auth.sub} (${auth.phone}) requested account deletion`);

  try {
    // Анонимизируем активные брони (не удаляем, чтобы не сломать бухгалтерию)
    await db
      .update(bookings)
      .set({
        userId: null,
        carNumber: "DELETED",
        carModel: null,
        notes: "Account deleted by user",
        status: "cancelled" as const,
      })
      .where(eq(bookings.userId, auth.sub));

    // Удаляем loyalty транзакции
    await db.delete(loyaltyTransactions).where(eq(loyaltyTransactions.userId, auth.sub));

    // Удаляем самого пользователя
    await db.delete(users).where(eq(users.id, auth.sub));

    console.log(`[me/DELETE] user ${auth.sub} deleted successfully`);
    return NextResponse.json({ ok: true, deletedAt: new Date().toISOString() });
  } catch (e) {
    console.error("[me/DELETE] failed", e);
    return NextResponse.json({ error: "DELETE_FAILED", message: (e as Error).message }, { status: 500 });
  }
}
