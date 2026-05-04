/**
 * Расчёт стоимости парковки.
 * Простая модель: 150 ₽/сут, тиры скидок по сумме баллов.
 * Когда придут реальные правила тарификации — заменить.
 */

import type { Airport, CalculatorRequest, CalculatorResponse } from "@uletnaya/shared";

const PRICE_PER_DAY_RUB: Record<Airport, number> = {
  SVO: 150,
  DME: 150,
  VKO: 150,
};

const POINT_TO_RUB = 1;          // 1 балл = 1 ₽
const CASHBACK_PCT = 5;          // 5% возврат баллами

export function calculate(req: CalculatorRequest): CalculatorResponse {
  const from = new Date(req.dateFrom).getTime();
  const to = new Date(req.dateTo).getTime();
  const ms = Math.max(0, to - from);
  const days = Math.max(1, Math.ceil(ms / 86_400_000));

  const pricePerDayRub = PRICE_PER_DAY_RUB[req.airport];
  const totalRub = days * pricePerDayRub;

  // Промокод (заглушка)
  const discountRub = req.promoCode === "FIRST10" ? Math.round(totalRub * 0.1) : 0;

  const usePts = Math.min(req.useLoyaltyPoints ?? 0, totalRub - discountRub);
  const loyaltyDiscountRub = usePts * POINT_TO_RUB;

  const finalRub = Math.max(0, totalRub - discountRub - loyaltyDiscountRub);
  const pointsToEarn = Math.floor((finalRub * CASHBACK_PCT) / 100);

  return { days, pricePerDayRub, totalRub, discountRub, loyaltyDiscountRub, finalRub, pointsToEarn };
}
