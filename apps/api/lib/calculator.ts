/**
 * Расчёт стоимости — парковка по суткам или ночёвка по тарифам (6ч/12ч/сутки).
 *
 * Формулы синхронизированы с uCalc «Бронь uletnayaparkovka.ru»:
 *
 * ПАРКОВКА:
 *   V = (dateTo - dateFrom) в сутках (=количество ночёвок)
 *   Всего дней = V + 1
 *   Цена:
 *     если V == 1 или V == 2 → 900 ₽ (акция short-stay из JS-override uCalc)
 *     если V == 3            → 1400 ₽ (uCalc минимум для V<4)
 *     иначе (V >= 4)         → V × 350 + 350
 *
 * НОЧЁВКА:
 *   V = (dateTo - dateFrom) в сутках
 *   AA = тариф первого блока: 500 (6 ч) | 800 (12 ч)
 *   Всего дней = V
 *   Цена = V × 1200 + AA
 */

import type { Airport, CalculatorRequest, CalculatorResponse } from "@uletnaya/shared";

// Тарифы первого блока ночёвки (как в uCalc списке AA)
const NOCHEVKA_BLOCK_RUB = {
  6: 500,    // 6 часов
  12: 800,   // 12 часов
  24: 1200,  // сутки (если выберут вариант 24ч как первый блок)
} as const;

const NOCHEVKA_DAILY_RUB = 1200;
const PARKING_DAILY_RUB = 350;
const PARKING_FIXED_FEE_RUB = 350;
const PARKING_MIN_RUB = 1400;            // V == 3
const PARKING_SHORT_STAY_RUB = 900;       // V == 1 || V == 2 (акция)
const PARKING_MIN_THRESHOLD_NIGHTS = 4;

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

  const from = new Date(req.dateFrom).getTime();
  const to = new Date(req.dateTo).getTime();
  const ms = Math.max(0, to - from);
  // V в uCalc — количество "ночёвок" между датами
  const V = Math.max(0, Math.floor(ms / 86_400_000));

  if (req.service === "nochevka") {
    const hours = (req.nochevkaHours ?? 6) as 6 | 12 | 24;
    const blockRub = NOCHEVKA_BLOCK_RUB[hours] ?? NOCHEVKA_BLOCK_RUB[6];
    // Формула uCalc: V × 1200 + AA
    totalRub = V * NOCHEVKA_DAILY_RUB + blockRub;
    days = Math.max(1, V); // "Всего дней" = V
    pricePerDayRub = NOCHEVKA_DAILY_RUB;
  } else {
    // ПАРКОВКА по uCalc (с JS-override акции для коротких поездок)
    if (V === 1 || V === 2) {
      totalRub = PARKING_SHORT_STAY_RUB;
    } else if (V < PARKING_MIN_THRESHOLD_NIGHTS) {
      // V == 3 — uCalc минимум
      totalRub = PARKING_MIN_RUB;
    } else {
      // V >= 4 — uCalc формула V × 350 + 350
      totalRub = V * PARKING_DAILY_RUB + PARKING_FIXED_FEE_RUB;
    }
    days = V + 1; // "Всего дней" = V + 1
    pricePerDayRub = PARKING_DAILY_RUB;
  }

  const discountRub = req.promoCode === "FIRST10" ? Math.round(totalRub * 0.1) : 0;
  const usePts = Math.min(req.useLoyaltyPoints ?? 0, totalRub - discountRub);
  const loyaltyDiscountRub = usePts * POINT_TO_RUB;
  const finalRub = Math.max(0, totalRub - discountRub - loyaltyDiscountRub);
  const pointsToEarn = Math.floor((finalRub * CASHBACK_PCT) / 100);

  return { days, pricePerDayRub, totalRub, discountRub, loyaltyDiscountRub, finalRub, pointsToEarn };
}
