import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing } from "@/lib/theme";

interface Props {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: Props) {
  return (
    <View style={s.wrap}>
      <Text style={s.title}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={s.action}>{action.label} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.overline,
    color: colors.textPrimary,
    letterSpacing: 1.5,
  },
  action: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
});
