import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from "react-native";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", loading, disabled, style }: Props) {
  const bg = variant === "primary" ? "#FF6B4A" : variant === "danger" ? "rgba(255,107,74,0.12)" : "#2D3039";
  const fg = variant === "danger" ? "#FF6B4A" : "#fff";
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg, opacity: disabled || loading ? 0.5 : 1 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={fg} />
        : <Text style={[s.label, { color: fg }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { padding: 16, borderRadius: 12, alignItems: "center" },
  label: { fontSize: 16, fontWeight: "600" },
});
