import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, typography, spacing } from "@/lib/theme";
import type { ReactNode } from "react";

/**
 * ScreenHeader — графитовая шапка экрана, единый паттерн.
 * Используется во всех табах и wizard-screen'ах.
 */
export function ScreenHeader({
  title,
  eyebrow,
  rightAction,
  back,
}: {
  title: string;
  eyebrow?: string;
  rightAction?: ReactNode;
  back?: { label?: string; onPress: () => void };
}) {
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {back ? (
          <TouchableOpacity onPress={back.onPress} style={s.back}>
            <Text style={s.backTxt}>← {back.label ?? ""}</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
        <View style={{ flex: 1 }} />
        {rightAction ?? <View style={{ width: 60 }} />}
      </View>

      {eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
      <Text style={s.title}>{title}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  back: {
    paddingVertical: 4, paddingRight: 8,
  },
  backTxt: { color: colors.primary, fontWeight: "600", fontSize: 13 },

  eyebrow: {
    ...typography.overline,
    color: colors.primary,
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  title: {
    color: colors.textOnDark,
    fontSize: 26,
    fontWeight: "300",
    fontFamily: typography.displaySm.fontFamily,
    lineHeight: 32,
  },
});
