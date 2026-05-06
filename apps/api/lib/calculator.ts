/**
 * Расчёт стоимости — парковка по суткам или ночёвка по тарифам (6ч/12ч/сутки).
 */

import type { Airport, CalculatorRequest, CalculatorResponse } from "@uletnaya/shared";

const PRICE_PER_DAY_RUB: Record<Airport, number> = {
  SVO: 150,
  DME: 150,
  VKO: 150,
};

// Тарифы на ночёвку (как на сайте uletnayaparkovka.ru/uletnaya-nochevka)
const NOCHEVKA_RUB = {
  6: 500,    // 6 часов
  12: 800,   // 12 часов
  24: 1200,  // сутки
} as const;

const POINT_TO_RUB = 1;
const CASHBACK_PCT = 5;

export type ServiceType = "parking" | "nochevka";

export interface ExtendedCalcRequest extends CalculatorRequest {
  service?: ServiceType;
  nochevkaHours?: 6 | 12 | 24;
}

export function calculate(req: ExtendedCalcRequest): CalculatorResponse {
  let days: number;
  let pricePerDayRub: number;
  let totalRub: number;

  if (req.service === "nochevka") {
    const hours = (req.nochevkaHours ?? 6) as 6 | 12 | 24;
    pricePerDayRub = NOCHEVKA_RUB[hours] ?? NOCHEVKA_RUB[6];
    days = 1;
    totalRub = pricePerDayRub;
  } else {
    const from = new Date(req.dateFrom).getTime();
    const to = new Date(req.dateTo).getTime();
    const ms = Math.max(0, to - from);
    days = Math.max(1, Math.ceil(ms / 86_400_000));
    pricePerDayRub = PRICE_PER_DAY_RUB[req.airport];
    totalRub = days * pricePerDayRub;
  }

  const discountRub = req.promoCode === "FIRST10" ? Math.round(totalRub * 0.1) : 0;
  const usePts = Math.min(req.useLoyaltyPoints ?? 0, totalRub - discountRub);
  const loyaltyDiscountRub = usePts * POINT_TO_RUB;
  const finalRub = Math.max(0, totalRub - discountRub - loyaltyDiscountRub);
  const pointsToEarn = Math.floor((finalRub * CASHBACK_PCT) / 100);

  return { days, pricePerDayRub, totalRub, discountRub, loyaltyDiscountRub, finalRub, pointsToEarn };
}
