import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors, radii, spacing, typography } from "@/lib/theme";

type Tone = "primary" | "success" | "warning" | "danger" | "muted" | "info";

interface PillProps {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
  style?: ViewStyle;
}

const TONES: Record<Tone, { fg: string; bg: string }> = {
  primary: { fg: colors.primary,    bg: colors.primarySoft },
  success: { fg: colors.success,    bg: colors.successBg },
  warning: { fg: colors.warning,    bg: colors.warningBg },
  danger:  { fg: colors.danger,     bg: colors.dangerBg },
  muted:   { fg: colors.textMuted,  bg: colors.surfaceMuted },
  info:    { fg: colors.info,       bg: colors.infoBg },
};

export function Pill({ label, tone = "muted", size = "sm", style }: PillProps) {
  const { fg, bg } = TONES[tone];
  const isSm = size === "sm";
  return (
    <View
      style={[
        {
          backgroundColor: bg,
          paddingHorizontal: isSm ? 8 : 12,
          paddingVertical: isSm ? 3 : 5,
          borderRadius: radii.pill,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text
        style={{
          ...(isSm ? typography.caption : typography.label),
          color: fg,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontSize: isSm ? 10 : 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
