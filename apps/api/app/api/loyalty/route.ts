import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, users, loyaltyTransactions } from "@/lib/db";
import { getUserFromHeader } from "@/lib/auth";
import { progressToNextTier, TIER_THRESHOLDS_KOPEKS, REFERRAL_BONUS_RUB } from "@/lib/loyalty";

export async function GET(req: Request) {
  const auth = await getUserFromHeader(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const [user] = await db.select().from(users).where(eq(users.id, auth.sub)).limit(1);
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  const txs = await db
    .select()
    .from(loyaltyTransactions)
    .where(eq(loyaltyTransactions.userId, user.id))
    .orderBy(desc(loyaltyTransactions.createdAt))
    .limit(20);

  const prog = await progressToNextTier(user.id);
  const remainingKopeks = prog.nextTier
    ? (prog.nextTier === "silver" ? TIER_THRESHOLDS_KOPEKS.silver : TIER_THRESHOLDS_KOPEKS.gold) - prog.spentKopeks
    : 0;

  return NextResponse.json({
    tier: user.loyaltyTier,
    points: user.loyaltyPoints,
    referralCode: user.referralCode,
    referralBonusRub: REFERRAL_BONUS_RUB,
    nextTier: prog.nextTier,
    progress: prog.progress,
    remainingToNextTierRub: Math.max(0, Math.round(remainingKopeks / 100)),
    transactions: txs.map(t => ({
      id: t.id,
      delta: t.deltaPoints,
      reason: t.reason,
      bookingId: t.bookingId,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
