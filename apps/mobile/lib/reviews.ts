import { Linking } from "react-native";
import { notify } from "./ui";

/**
 * Карточка «Улётной парковки» на Яндекс.Картах, вкладка отзывов.
 * Отзывы — главный разрыв с конкурентами (у них тысячи, у нас сотни),
 * а карточка организации в картах стоит в выдаче выше рекламы.
 */
export const YANDEX_REVIEWS_URL =
  "https://yandex.ru/maps/org/ulyotnaya_parkovka/64527453581/reviews/";

/**
 * Клиент уже был на парковке? Тогда зовём оценить.
 * По будущей броне просить оценку нечего — там это «почитать отзывы».
 */
export function hasStayed(status: string): boolean {
  return status === "active" || status === "completed";
}

export function reviewLabel(status: string): string {
  return hasStayed(status) ? "★  Оценить на Яндекс.Картах" : "★  Отзывы о парковке";
}

export async function openYandexReviews(): Promise<void> {
  try {
    await Linking.openURL(YANDEX_REVIEWS_URL);
  } catch {
    notify("Не удалось открыть", "Яндекс.Карты → «Улётная парковка» → Отзывы");
  }
}
