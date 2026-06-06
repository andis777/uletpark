/**
 * Единая точка для маршрута на нашу парковку «Улётная» (Шереметьево).
 *
 * Координаты площадки — с. Чашниково, г.о. Химки, 5 минут до терминалов
 * Шереметьево. Используются и в навбаре (быстрый переход в Я.Навигатор),
 * и в RouteMapModal (карта + построение маршрута).
 */
import { Linking } from "react-native";

export const PARKING = {
  lat: 55.99127,
  lon: 37.42298,
  name: "Улётная Пит-стоп парковка",
  addr: "с. Чашниково, г.о. Химки",
} as const;

/**
 * Сразу строит маршрут на нашу парковку в Я.Навигаторе.
 * Если приложение не установлено — fallback на Я.Карты (веб/приложение).
 */
export function openParkingNavigator() {
  const deep = `yandexnavi://build_route_on_map?lat_to=${PARKING.lat}&lon_to=${PARKING.lon}`;
  const web = `https://yandex.ru/maps/?rtext=~${PARKING.lat},${PARKING.lon}&rtt=auto&z=15`;
  Linking.canOpenURL(deep)
    .then((can) => Linking.openURL(can ? deep : web))
    .catch(() => Linking.openURL(web));
}
