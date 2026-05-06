/**
 * Design system tokens — Улётная парковка.
 * Синхронизирован с uletnayaparkovka.ru.
 *
 * Принципы:
 *   - Тёмный graphite header + светлый body
 *   - Бирюзовый teal #3FB8AF — primary CTA
 *   - 8pt grid для spacing
 *   - Inter (body) + Manrope (heading)
 *   - Закруглённые формы, мягкие тени, без агрессивных цветов
 */

import { Platform } from "react-native";

/* =========================================================================
 * Colors
 * ======================================================================= */

export const colors = {
  // Brand
  primary:        "#3FB8AF",   // teal — CTA, акценты, активные ссылки
  primaryHover:   "#59D8CF",
  primaryDark:    "#1A9A8E",
  primarySoft:    "rgba(63,184,175,0.12)",   // фон активного таба, hover-pill

  // Surfaces
  graphite:       "#2D3039",   // header, footer, dark surfaces
  graphiteSoft:   "#3a3d47",
  surface:        "#FFFFFF",
  surfaceMuted:   "#F4F5F7",   // светлые карточки на белом
  surfacePaper:   "#F6F4F0",   // тёплый бежевый
  surfaceDimmed:  "rgba(0,0,0,0.04)",

  // Text
  textPrimary:    "#0A0B0D",
  textSecondary:  "#5A6072",
  textMuted:      "#8A8FA0",
  textOnDark:     "#FFFFFF",
  textOnPrimary:  "#FFFFFF",

  // States
  success:        "#1A6E4E",
  successBg:      "#ECF8F1",
  warning:        "#A06614",
  warningBg:      "#FDF3E3",
  danger:         "#BD0214",
  dangerBg:       "#FBECE8",
  info:           "#1F5BA8",
  infoBg:         "#E8F1FB",

  // Misc
  warmCta:        "#FF6B4A",   // тёплый акцент для дифференциации
  divider:        "#E7E5DF",
  border:         "#D6D2CC",
  borderSoft:     "#EDE9E2",
  shadow:         "rgba(10, 11, 13, 0.08)",
  shadowSoft:     "rgba(10, 11, 13, 0.04)",
  overlay:        "rgba(10, 11, 13, 0.4)",
};

/* =========================================================================
 * Typography
 * ======================================================================= */

export const fonts = {
  body:    "Inter, system-ui, -apple-system, sans-serif",
  heading: "Manrope, Inter, system-ui, sans-serif",
  mono:    "JetBrains Mono, ui-monospace, Menlo, monospace",
};

export const typography = {
  // Display — для hero
  displayLg: { fontSize: 32, fontWeight: "300" as const, lineHeight: 38, letterSpacing: -0.5, fontFamily: fonts.heading },
  displayMd: { fontSize: 28, fontWeight: "300" as const, lineHeight: 34, letterSpacing: -0.3, fontFamily: fonts.heading },
  displaySm: { fontSize: 24, fontWeight: "300" as const, lineHeight: 30, fontFamily: fonts.heading },

  // Heading
  h1: { fontSize: 22, fontWeight: "600" as const, lineHeight: 28, fontFamily: fonts.heading },
  h2: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24, fontFamily: fonts.heading },
  h3: { fontSize: 16, fontWeight: "600" as const, lineHeight: 22, fontFamily: fonts.heading },

  // Body
  bodyLg: { fontSize: 16, fontWeight: "400" as const, lineHeight: 24, fontFamily: fonts.body },
  bodyMd: { fontSize: 14, fontWeight: "400" as const, lineHeight: 20, fontFamily: fonts.body },
  bodySm: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16, fontFamily: fonts.body },

  // UI labels / overline
  label:    { fontSize: 13, fontWeight: "600" as const, lineHeight: 18, fontFamily: fonts.body },
  caption:  { fontSize: 11, fontWeight: "500" as const, lineHeight: 14, fontFamily: fonts.body },
  overline: { fontSize: 10, fontWeight: "700" as const, lineHeight: 12, letterSpacing: 1.5, textTransform: "uppercase" as const, fontFamily: fonts.body },

  // Numerics — крупные цифры (баллы, цена)
  numXl: { fontSize: 48, fontWeight: "200" as const, lineHeight: 52, fontFamily: fonts.heading },
  numLg: { fontSize: 32, fontWeight: "300" as const, lineHeight: 36, fontFamily: fonts.heading },
};

/* =========================================================================
 * Spacing — 8pt grid
 * ======================================================================= */

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  xxxl: 48,
  huge: 64,
};

/* =========================================================================
 * Radii
 * ======================================================================= */

export const radii = {
  none: 0,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  pill: 100,
  full: 9999,
};

/* =========================================================================
 * Shadows — для floating элементов
 * ======================================================================= */

export const shadows = {
  none: {
    shadowColor: "transparent", shadowOpacity: 0, shadowRadius: 0, elevation: 0,
  },
  card: Platform.select({
    web: {
      // На web — boxShadow через style; RN-Web подхватит shadowColor/Opacity
      shadowColor: colors.shadowSoft,
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 2 },
    },
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
  }) as any,
  cardHover: {
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // Большая тень для floating-tab-bar
  floatingBar: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  // Свечение primary — для ярких акцентов (активного таба)
  primaryGlow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
};

/* =========================================================================
 * Motion / Easing
 * ======================================================================= */

export const motion = {
  fast:   150,
  base:   220,
  slow:   320,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
};

/* =========================================================================
 * Z-index
 * ======================================================================= */

export const zIndex = {
  base:    0,
  raised:  10,
  sticky:  100,
  overlay: 1000,
  modal:   2000,
  toast:   3000,
};
