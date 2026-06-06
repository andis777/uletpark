/**
 * Custom Tab Bar — floating, animated active pill, modern
 *
 * Дизайн:
 *   - Floating bar с большой тенью внизу экрана (не прижат к нижней грани)
 *   - Скруглённые края (radii.xxl)
 *   - Светлый фон (white) на body screens
 *   - Активный таб: бирюзовая «капсула» под иконкой + лейблом
 *   - Иконки 22px, лёгкая анимация при переключении (scale)
 *   - Safe-area aware (учитывает iPhone home indicator)
 */

import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, typography, spacing, radii, shadows } from "@/lib/theme";
import { openParkingNavigator } from "@/lib/navigator";

// SVG-иконки прямо в компоненте (без зависимостей @expo/vector-icons)
function Icon({ name, color, size = 22 }: { name: TabIcon; color: string; size?: number }) {
  // Используем emoji-fallback на web (стабильнее чем SVG в RN-Web)
  // На native — тоже emoji для портативности
  const map: Record<TabIcon, string> = {
    home:     "⌂",
    bookings: "▤",
    loyalty:  "★",
    profile:  "◐",
  };
  return (
    <Text style={{ fontSize: size, color, lineHeight: size + 4 }}>
      {map[name]}
    </Text>
  );
}

type TabIcon = "home" | "bookings" | "loyalty" | "profile";
const ROUTE_TO_ICON: Record<string, { icon: TabIcon; label: string }> = {
  index:    { icon: "home",     label: "Главная" },
  bookings: { icon: "bookings", label: "Брони" },
  loyalty:  { icon: "loyalty",  label: "Карта" },
  profile:  { icon: "profile",  label: "Профиль" },
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        s.wrap,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
      pointerEvents="box-none"
    >
      <View style={s.bar}>
        {state.routes.map((route, index) => {
          const meta = ROUTE_TO_ICON[route.name];
          if (!meta) return null;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              icon={meta.icon}
              label={meta.label}
              focused={isFocused}
              onPress={onPress}
            />
          );
        })}

        {/* Навигатор — не вкладка, а действие: сразу строит маршрут на нашу
            парковку в Я.Навигаторе (Шереметьево). */}
        <NavButton onPress={openParkingNavigator} />
      </View>
    </View>
  );
}

function NavButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.tab} activeOpacity={0.7}>
      <View style={[s.pill, s.navPill]} />
      <View style={s.tabContent}>
        <Text style={{ fontSize: 20, color: colors.textOnPrimary, lineHeight: 24 }}>🧭</Text>
        <Text style={[s.label, { color: colors.textOnPrimary, fontWeight: "700" }]}>
          Навигатор
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function TabButton({
  icon,
  label,
  focused,
  onPress,
}: {
  icon: TabIcon;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(focused ? 1.05 : 1)).current;
  const pillOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.05 : 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }),
      Animated.timing(pillOpacity, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, pillOpacity]);

  return (
    <TouchableOpacity onPress={onPress} style={s.tab} activeOpacity={0.7}>
      {/* Активная капсула */}
      <Animated.View style={[s.pill, { opacity: pillOpacity }]} />

      <Animated.View style={[s.tabContent, { transform: [{ scale }] }]}>
        <Icon
          name={icon}
          color={focused ? colors.textOnPrimary : colors.textMuted}
          size={20}
        />
        <Text
          style={[
            s.label,
            { color: focused ? colors.textOnPrimary : colors.textMuted },
            focused && { fontWeight: "700" },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    backgroundColor: "transparent",
  },

  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...(shadows.floatingBar as object),
    // На web дополнительно через CSS box-shadow
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 8px 32px rgba(10,11,13,0.10), 0 2px 8px rgba(10,11,13,0.06)" } as any)
      : {}),
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.xl,
  },

  pill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
  },

  // Навигатор-кнопка всегда подсвечена (action, а не активная вкладка)
  navPill: {
    opacity: 1,
  },

  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },

  label: {
    ...typography.caption,
    marginTop: 2,
  },
});
