import { View, ViewStyle, StyleSheet, TouchableOpacity, Platform } from "react-native";
import type { ReactNode } from "react";
import { colors, radii, spacing, shadows } from "@/lib/theme";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "muted" | "outlined" | "elevated" | "filled";
  padding?: keyof typeof spacing;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export function Card({ children, variant = "default", padding = "lg", onPress, style }: CardProps) {
  const variantStyle = (() => {
    switch (variant) {
      case "muted":    return s.muted;
      case "outlined": return s.outlined;
      case "elevated": return s.elevated;
      case "filled":   return s.filled;
      default:         return s.default;
    }
  })();

  const composed = [
    s.base,
    variantStyle,
    { padding: spacing[padding] },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={composed} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={composed}>{children}</View>;
}

const s = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
  },
  default: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
  },
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    backgroundColor: colors.surface,
    ...(shadows.card as object),
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 2px 12px rgba(10,11,13,0.06)" } as any)
      : {}),
  },
  filled: {
    backgroundColor: colors.primary,
  },
});
