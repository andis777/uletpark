import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { colors, fonts, radii, spacing } from "@/lib/theme";

interface Props {
  visible: boolean;
  name: string;
  dateFrom: Date;
  priceRub: number;
  bookingId?: string;
  service: "parking" | "nochevka";
  onClose: () => void;
  onShowMap: () => void;
}

export function BookingSuccessModal({ visible, name, dateFrom, priceRub, bookingId, service, onClose, onShowMap }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.bg} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.checkCircle}>
            <Text style={s.checkIcon}>✓</Text>
          </View>

          <Text style={s.h2}>Уважаемый {name || "клиент"}!</Text>
          <Text style={s.lede}>
            <Text style={{ fontWeight: "700", color: colors.primary }}>Бронирование подтверждено</Text> 🎉
          </Text>
          <Text style={s.lede2}>
            Ожидаем вас{" "}
            <Text style={{ fontWeight: "700", color: colors.graphite }}>
              {dateFrom.toLocaleDateString("ru", { day: "numeric", month: "long" })}
            </Text>.
            {"\n"}
            Менеджер перезвонит в течение 5 минут.
          </Text>

          <View style={s.priceBox}>
            <Text style={s.priceLabel}>
              {service === "parking" ? "🅿️ Парковка" : "🛏️ Ночёвка"}
            </Text>
            <Text style={s.priceValue}>{priceRub.toLocaleString("ru")} ₽</Text>
          </View>

          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnSecondary} onPress={() => { onClose(); onShowMap(); }}>
              <Text style={s.btnSecondaryTxt}>📍 Схема проезда</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnPrimary} onPress={onClose}>
              <Text style={s.btnPrimaryTxt}>OK</Text>
            </TouchableOpacity>
          </View>

          {bookingId && (
            <Text style={s.bookingId}>Бронь №{bookingId.slice(0, 8).toUpperCase()}</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "rgba(15,20,25,0.7)", justifyContent: "center", padding: 16 },
  sheet: {
    backgroundColor: "white", borderRadius: 24, padding: spacing.xxl,
    alignItems: "center", maxWidth: 480, width: "100%", alignSelf: "center",
  },

  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.lg,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  checkIcon: { color: "white", fontSize: 40, fontWeight: "800" },

  h2: { fontSize: 22, fontWeight: "700", color: colors.graphite, marginBottom: spacing.sm, textAlign: "center" },
  lede: { fontSize: 16, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.xs },
  lede2: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginBottom: spacing.lg, lineHeight: 22 },

  priceBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(63,184,175,0.08)",
    borderColor: "rgba(63,184,175,0.3)", borderWidth: 1, borderStyle: "dashed",
    padding: spacing.md, borderRadius: radii.md,
    width: "100%", marginBottom: spacing.lg,
  },
  priceLabel: { color: colors.textSecondary, fontSize: 14 },
  priceValue: { color: colors.primary, fontSize: 22, fontWeight: "700", fontFamily: fonts.heading },

  btnRow: { flexDirection: "row", gap: 10, width: "100%" },
  btnPrimary: { flex: 1, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radii.md, alignItems: "center" },
  btnPrimaryTxt: { color: "white", fontWeight: "700", fontSize: 14 },
  btnSecondary: { flex: 1, backgroundColor: "white", padding: spacing.md, borderRadius: radii.md, alignItems: "center", borderWidth: 1.5, borderColor: colors.primary },
  btnSecondaryTxt: { color: colors.primary, fontWeight: "700", fontSize: 14 },

  bookingId: { fontSize: 11, color: colors.textMuted, marginTop: spacing.md, fontFamily: "Menlo" },
});
