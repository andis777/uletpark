import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { listBookings } from "@/lib/api";
import { Button } from "@/components/Button";

export default function Bookings() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({ queryKey: ["bookings"], queryFn: listBookings });

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#3FB8AF" />}
    >
      <View style={s.head}>
        <Text style={s.h1}>Мои брони</Text>
        <Button label="+ Новая" onPress={() => router.push("/booking/new")} variant="secondary" style={{ paddingHorizontal: 14, paddingVertical: 10 }} />
      </View>

      {isLoading && <ActivityIndicator color="#3FB8AF" style={{ marginTop: 24 }} />}
      {error && <Text style={s.err}>Не удалось загрузить</Text>}

      {data?.bookings.map(b => (
        <TouchableOpacity key={b.id} style={s.card} onPress={() => router.push(`/booking/${b.id}`)} activeOpacity={0.8}>
          <View style={s.row}>
            <Text style={s.airport}>{b.airport}</Text>
            <Text style={[s.status, statusStyle(b.status)]}>{labelOf(b.status)}</Text>
          </View>
          <Text style={s.dates}>
            {new Date(b.dateFrom).toLocaleDateString("ru")} → {new Date(b.dateTo).toLocaleDateString("ru")}
          </Text>
          <Text style={s.car}>{b.carNumber ?? "—"} {b.carModel ?? ""}</Text>
          <View style={[s.row, { marginTop: 8 }]}>
            <Text style={s.price}>{b.priceRub.toLocaleString("ru")} ₽</Text>
            {b.loyaltyPointsEarned > 0 && <Text style={s.bonus}>+{b.loyaltyPointsEarned} баллов</Text>}
          </View>
        </TouchableOpacity>
      ))}

      {!isLoading && data?.bookings.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={s.empty}>Пока нет броней</Text>
          <Button label="Создать первую бронь" onPress={() => router.push("/booking/new")} style={{ marginTop: 16 }} />
        </View>
      )}
    </ScrollView>
  );
}

function labelOf(s: string) {
  return ({ new: "Новая", confirmed: "Подтверждена", active: "Активна", completed: "Завершена", cancelled: "Отменена" } as const)[s as "new"] ?? s;
}
function statusStyle(st: string) {
  if (st === "completed") return { color: "#3FB8AF", backgroundColor: "rgba(63,184,175,0.15)" };
  if (st === "cancelled") return { color: "#8a8580", backgroundColor: "rgba(138,133,128,0.15)" };
  return { color: "#FF6B4A", backgroundColor: "rgba(255,107,74,0.15)" };
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#1F2430" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  h1: { color: "#fff", fontSize: 28, fontWeight: "300" },
  card: { backgroundColor: "#2D3039", padding: 16, borderRadius: 12, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  airport: { color: "#3FB8AF", fontSize: 18, fontWeight: "600" },
  status: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, textTransform: "uppercase", letterSpacing: 1, fontWeight: "600" },
  dates: { color: "#fff", fontSize: 16, marginBottom: 4 },
  car: { color: "#8a8580", fontSize: 13 },
  price: { color: "#fff", fontSize: 20, fontWeight: "300" },
  bonus: { color: "#3FB8AF", fontSize: 12, fontWeight: "500" },
  err: { color: "#FF6B4A", marginTop: 24, textAlign: "center" },
  emptyBox: { alignItems: "center", marginTop: 64 },
  empty: { color: "#8a8580", fontSize: 14 },
});
