import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { listBookings } from "@/lib/api";
import { colors, fonts, radii, spacing } from "@/lib/theme";

export default function Bookings() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ["bookings"], queryFn: listBookings });

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={s.header}>
        <Text style={s.brand}>Мои брони</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)")} style={s.addBtn}>
          <Text style={s.addBtnTxt}>+ Новая</Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {isLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
        {error && <Text style={s.err}>Не удалось загрузить</Text>}

        {data?.bookings.map(b => (
          <TouchableOpacity key={b.id} style={s.card} onPress={() => router.push(`/booking/${b.id}`)} activeOpacity={0.7}>
            <View style={s.cardHead}>
              <Text style={s.airport}>{b.airport}</Text>
              <Text style={[s.status, statusStyle(b.status)]}>{labelOf(b.status)}</Text>
            </View>
            <Text style={s.dates}>
              {new Date(b.dateFrom).toLocaleDateString("ru")} → {new Date(b.dateTo).toLocaleDateString("ru")}
            </Text>
            <Text style={s.car}>{b.carNumber ?? "—"} {b.carModel ?? ""}</Text>
            <View style={s.cardFoot}>
              <Text style={s.price}>{b.priceRub.toLocaleString("ru")} ₽</Text>
              {b.loyaltyPointsEarned > 0 && <Text style={s.bonus}>+{b.loyaltyPointsEarned} баллов</Text>}
            </View>
          </TouchableOpacity>
        ))}

        {!isLoading && data?.bookings.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyIco}>🅿</Text>
            <Text style={s.empty}>Пока нет броней</Text>
            <TouchableOpacity style={s.cta} onPress={() => router.push("/(tabs)")}>
              <Text style={s.ctaTxt}>Создать первую бронь</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function labelOf(s: string) {
  return ({ new: "Новая", confirmed: "Подтверждена", active: "Активна", completed: "Завершена", cancelled: "Отменена" } as const)[s as "new"] ?? s;
}
function statusStyle(st: string) {
  if (st === "completed") return { color: colors.success, backgroundColor: colors.successBg };
  if (st === "cancelled") return { color: colors.textMuted, backgroundColor: colors.surfaceMuted };
  return { color: colors.warning, backgroundColor: colors.warningBg };
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 100 },

  header: {
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { color: colors.textOnDark, fontSize: 22, fontWeight: "300", fontFamily: fonts.heading },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  addBtnTxt: { color: colors.textOnDark, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  body: { padding: spacing.xl },

  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  airport: { color: colors.primary, fontSize: 18, fontWeight: "700", letterSpacing: 1 },
  status: { fontSize: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  dates: { color: colors.textPrimary, fontSize: 16, marginBottom: 4 },
  car: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.sm },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { color: colors.textPrimary, fontSize: 22, fontWeight: "300", fontFamily: fonts.heading },
  bonus: { color: colors.primary, fontSize: 12, fontWeight: "600" },

  err: { color: colors.danger, marginTop: 24, textAlign: "center" },

  emptyBox: { alignItems: "center", marginTop: 80 },
  emptyIco: { fontSize: 48, marginBottom: spacing.md, opacity: 0.4 },
  empty: { color: colors.textMuted, fontSize: 14, marginBottom: spacing.lg },
  cta: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.md },
  ctaTxt: { color: colors.textOnDark, fontSize: 14, fontWeight: "700" },
});
