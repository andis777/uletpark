/**
 * Loyalty engine
 *
 * Правила работы (default — конфигурируется в loyalty_rules):
 *   - Cashback 5% от final price → начисляются как баллы (1 балл = 1 ₽)
 *   - Тиры по сумме оплаченных броней за всё время:
 *       Bronze: 0
 *       Silver: 5 000 ₽
 *       Gold:   25 000 ₽
 *   - Реферальный бонус: пригласившему +500 ₽ при первой оплаченной брони friend
 *                         приглашённому +500 ₽ при регистрации
 *   - Использование баллов: 1:1 к рублю, не больше суммы покупки
 */

import { eq, sum, and, isNotNull } from "drizzle-orm";
import { db, users, bookings, loyaltyTransactions, loyaltyRules } from "@uletnaya/db";

export const TIER_THRESHOLDS_KOPEKS: Record<"silver" | "gold", number> = {
  silver: 5_000_00,
  gold: 25_000_00,
};

export const CASHBACK_PCT = 5;
export const REFERRAL_BONUS_RUB = 500;

export type Tier = "bronze" | "silver" | "gold";

/* =========================================================================
 * Чтение правил из БД (с fallback к константам выше)
 * ======================================================================= */

export async function getCashbackPct(): Promise<number> {
  try {
    const rules = await db.select().from(loyaltyRules)
      .where(and(eq(loyaltyRules.type, "cashback_pct"), eq(loyaltyRules.active, true)))
      .limit(1);
    const cfg = rules[0]?.config as { pct?: number } | undefined;
    return cfg?.pct ?? CASHBACK_PCT;
  } catch { return CASHBACK_PCT; }
}

/* =========================================================================
 * Начисление за завершённую бронь
 * ======================================================================= */

export async function awardForBooking(bookingId: string): Promise<{ awarded: number; newTier: Tier } | null> {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!b || !b.userId) return null;
  if (b.status !== "completed") return null;

  // Идемпотентность: если по этой брони уже было booking_completed начисление — пропускаем
  const prior = await db.select().from(loyaltyTransactions)
    .where(and(
      eq(loyaltyTransactions.bookingId, bookingId),
      eq(loyaltyTransactions.reason, "booking_completed"),
    ))
    .limit(1);
  if (prior.length > 0) return null;

  const pct = await getCashbackPct();
  const finalRub = Math.round(b.priceKopecks / 100);
  const points = Math.floor((finalRub * pct) / 100);

  if (points > 0) {
    await db.insert(loyaltyTransactions).values({
      userId: b.userId,
      deltaPoints: points,
      reason: "booking_completed",
      bookingId,
    });
    await db.update(users)
      .set({ loyaltyPoints: (await currentPoints(b.userId)) + points, updatedAt: new Date() })
      .where(eq(users.id, b.userId));

    await db.update(bookings).set({ loyaltyPointsEarned: points }).where(eq(bookings.id, b.id));
  }

  const newTier = await recalcTier(b.userId);
  return { awarded: points, newTier };
}

/* =========================================================================
 * Списание баллов при создании брони
 * ======================================================================= */

export async function redeemForBooking(args: {
  userId: string;
  bookingId: string;
  pointsRequested: number;
  maxPriceRub: number;
}): Promise<{ redeemed: number; remainingPoints: number }> {
  const [u] = await db.select().from(users).where(eq(users.id, args.userId)).limit(1);
  if (!u) return { redeemed: 0, remainingPoints: 0 };

  const redeem = Math.max(0, Math.min(args.pointsRequested, u.loyaltyPoints, args.maxPriceRub));
  if (redeem === 0) return { redeemed: 0, remainingPoints: u.loyaltyPoints };

  await db.insert(loyaltyTransactions).values({
    userId: args.userId,
    deltaPoints: -redeem,
    reason: "redeem",
    bookingId: args.bookingId,
  });

  const remaining = u.loyaltyPoints - redeem;
  await db.update(users).set({ loyaltyPoints: remaining, updatedAt: new Date() })
    .where(eq(users.id, args.userId));

  return { redeemed: redeem, remainingPoints: remaining };
}

/* =========================================================================
 * Реферал
 * ======================================================================= */

export async function applyReferralCode(args: {
  newUserId: string;
  code: string;
}): Promise<{ ok: boolean; bonusRub: number; reason?: string }> {
  const [newUser] = await db.select().from(users).where(eq(users.id, args.newUserId)).limit(1);
  if (!newUser) return { ok: false, bonusRub: 0, reason: "USER_NOT_FOUND" };
  if (newUser.referredBy) return { ok: false, bonusRub: 0, reason: "ALREADY_USED" };

  const [referrer] = await db.select().from(users).where(eq(users.referralCode, args.code.trim().toUpperCase())).limit(1);
  if (!referrer) return { ok: false, bonusRub: 0, reason: "CODE_NOT_FOUND" };
  if (referrer.id === newUser.id) return { ok: false, bonusRub: 0, reason: "SELF_REFERRAL" };

  // Зафиксировать связь
  await db.update(users)
    .set({ referredBy: referrer.id, updatedAt: new Date() })
    .where(eq(users.id, newUser.id));

  // Бонус приглашённому — сразу
  await db.insert(loyaltyTransactions).values({
    userId: newUser.id,
    deltaPoints: REFERRAL_BONUS_RUB,
    reason: "referral_bonus_invited",
  });
  await db.update(users)
    .set({ loyaltyPoints: newUser.loyaltyPoints + REFERRAL_BONUS_RUB, updatedAt: new Date() })
    .where(eq(users.id, newUser.id));

  // Бонус пригласившему — отложен до первой завершённой брони friend (см. awardReferrerOnFirstCompleted)
  return { ok: true, bonusRub: REFERRAL_BONUS_RUB };
}

/**
 * Вызывается из awardForBooking при первой завершённой брони пользователя — даёт +500 ₽ его рефереру.
 */
export async function awardReferrerOnFirstCompleted(userId: string): Promise<{ ok: boolean }> {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u || !u.referredBy) return { ok: false };

  // Сколько у юзера completed-броней?
  const completedRows = await db.select().from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.status, "completed")));
  if (completedRows.length !== 1) return { ok: false };   // не первая

  // Уже выдан реферальный бонус приглашающему по этому юзеру?
  const existed = await db.select().from(loyaltyTransactions)
    .where(and(
      eq(loyaltyTransactions.userId, u.referredBy),
      eq(loyaltyTransactions.reason, "referral_bonus_referrer"),
    ));
  // Эвристика: ищем по reason — точную привязку к conretnomu рефералу можно класть в jsonb если потребуется
  if (existed.length >= 1) {
    // TODO более строгая идемпотентность — отдельная таблица referral_payouts
  }

  await db.insert(loyaltyTransactions).values({
    userId: u.referredBy,
    deltaPoints: REFERRAL_BONUS_RUB,
    reason: "referral_bonus_referrer",
  });
  await db.update(users)
    .set({ loyaltyPoints: (await currentPoints(u.referredBy)) + REFERRAL_BONUS_RUB, updatedAt: new Date() })
    .where(eq(users.id, u.referredBy));

  return { ok: true };
}

/* =========================================================================
 * Tier recalculation
 * ======================================================================= */

export async function recalcTier(userId: string): Promise<Tier> {
  const [{ total }] = await db.select({
    total: sum(bookings.priceKopecks).mapWith(Number),
  })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.status, "completed"), isNotNull(bookings.userId)));

  const totalKopeks = total ?? 0;
  let tier: Tier = "bronze";
  if (totalKopeks >= TIER_THRESHOLDS_KOPEKS.gold) tier = "gold";
  else if (totalKopeks >= TIER_THRESHOLDS_KOPEKS.silver) tier = "silver";

  await db.update(users).set({ loyaltyTier: tier, updatedAt: new Date() }).where(eq(users.id, userId));
  return tier;
}

/* =========================================================================
 * Helpers
 * ======================================================================= */

async function currentPoints(userId: string): Promise<number> {
  const [u] = await db.select({ p: users.loyaltyPoints }).from(users).where(eq(users.id, userId)).limit(1);
  return u?.p ?? 0;
}

export async function progressToNextTier(userId: string): Promise<{ tier: Tier; nextTier: "silver" | "gold" | null; progress: number; spentKopeks: number }> {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return { tier: "bronze", nextTier: "silver", progress: 0, spentKopeks: 0 };

  const [{ total }] = await db.select({
    total: sum(bookings.priceKopecks).mapWith(Number),
  })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.status, "completed")));
  const spent = total ?? 0;

  if (u.loyaltyTier === "bronze")
    return { tier: "bronze", nextTier: "silver", progress: Math.min(1, spent / TIER_THRESHOLDS_KOPEKS.silver), spentKopeks: spent };
  if (u.loyaltyTier === "silver")
    return { tier: "silver", nextTier: "gold", progress: Math.min(1, spent / TIER_THRESHOLDS_KOPEKS.gold), spentKopeks: spent };
  return { tier: "gold", nextTier: null, progress: 1, spentKopeks: spent };
}
