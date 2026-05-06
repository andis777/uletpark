/**
 * Theme — палитра и токены, синхронизированные с uletnayaparkovka.ru.
 * Бренд-палитра: teal #3FB8AF (primary CTA), graphite #2D3039 (header/dark surfaces),
 * white background, Inter font.
 */

export const colors = {
  // Бренд
  primary: "#3FB8AF",          // основной teal — CTA, акценты, активные ссылки
  primaryHover: "#59D8CF",     // светлая бирюза hover
  primaryDark: "#1A9A8E",      // насыщенный teal (refined)

  // Поверхности
  graphite: "#2D3039",         // тёмный графит — header, footer
  graphiteSoft: "#3a3d47",     // hover на тёмном
  surface: "#FFFFFF",          // основной фон (как на сайте)
  surfaceMuted: "#F0F1F6",     // светлые панели, карточки на белом
  surfacePaper: "#F6F4F0",     // тёплый бежевый (для footer / акцентов)

  // Текст
  textPrimary: "#0a0a0a",      // основной чёрный
  textSecondary: "#626C88",    // серо-синий описания
  textMuted: "#7F8C8D",        // вторичный
  textOnDark: "#FFFFFF",       // белый на graphite

  // Состояния
  success: "#1a6e4e",
  successBg: "#ecf8f1",
  warning: "#a06614",
  warningBg: "#fdf3e3",
  danger: "#BD0214",
  dangerBg: "#fbece8",

  // Дополнительно
  warmCta: "#FF6B4A",          // тёплый CTA для дифференциации (опционально)
  divider: "#E3E0DA",
  border: "#D6D2CC",
};

export const fonts = {
  // Inter — основной шрифт сайта; Manrope — для крупных заголовков (рекомендация в брифе)
  body: "Inter, system-ui, -apple-system, sans-serif",
  heading: "Manrope, Inter, system-ui, sans-serif",
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 100,
};

export const shadows = {
  card: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardHover: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
