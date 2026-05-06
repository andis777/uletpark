import { View, Text, StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { colors, typography, spacing } from "@/lib/theme";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={s.wrap}>
      <View style={s.iconBox}>
        <Text style={s.icon}>{icon}</Text>
      </View>
      <Text style={s.title}>{title}</Text>
      {description && <Text style={s.description}>{description}</Text>}
      {action && <View style={{ marginTop: spacing.lg }}>{action}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: spacing.xxxl * 1.5,
    paddingHorizontal: spacing.xl,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.lg,
  },
  icon: { fontSize: 36, opacity: 0.5 },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  description: {
    ...typography.bodyMd,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 280,
  },
});
