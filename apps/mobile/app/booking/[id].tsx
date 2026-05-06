import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { getBooking, cancelBooking } from "@/lib/api";
import { Button } from "@/components/Button";
import { confirmAction, notify } from "@/lib/ui";

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBooking(id),
    enabled: !!id,
  });

  const cancel = useMutation({
    mutationFn: () => cancelBooking(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", id] });
      notify("Бронь отменена");
    },
    onError: (e: Error) => notify("Не удалось отменить", e.message),
  });

  const onCancel = async () => {
    const ok = await confirmAction("Отменить бронь?", "Это действие нельзя отменить.");
    if (ok) cancel.mutate();
  };

  if (isLoading) return <ActivityIndicator color="#3FB8AF" style={{ flex: 1, backgroundColor: "#1F2430" }} />;
  if (error || !data) return <Text style={s.err}>Не удалось загрузить бронь</Text>;

  const b = data.booking;
  const upcoming = b.status === "new" || b.status === "confirmed" || b.status === "active";

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Все брони</Text></TouchableOpacity>

      <View style={s.hero}>
        <Text style={s.airport}>{b.airport === "SVO" ? "Шереметьево" : b.airport === "DME" ? "Домодедово" : "Внуково"}</Text>
        <Text style={s.dates}>
          {new Date(b.dateFrom).toLocaleDateString("ru")} → {new Date(b.dateTo).toLocaleDateString("ru")}
        </Text>
        <Text style={s.price}>{b.priceRub.toLocaleString("ru")} ₽</Text>
        <View style={[s.pill, upcoming ? s.pillUpcoming : s.pillDone]}>
          <Text style={[s.pillTxt, { color: upcoming ? "#FF6B4A" : "#3FB8AF" }]}>
            {labelOf(b.status)}
          </Text>
        </View>
      </View>

      <Detail k="Номер" v={b.id.slice(0, 8).toUpperCase()} />
      {b.amocrmLeadId && <Detail k="amoCRM #" v={String(b.amocrmLeadId)} />}
      <Detail k="Машина" v={b.carNumber ?? "—"} />
      {b.carModel && <Detail k="Модель" v={b.carModel} />}
      <Detail k="Источник" v={b.source} />
      <Detail k="Будет начислено" v={`+${b.loyaltyPointsEarned} баллов`} />
      {b.loyaltyPointsUsed > 0 && <Detail k="Использовано баллов" v={String(b.loyaltyPointsUsed)} />}
      {b.notes && <Detail k="Заметки" v={b.notes} />}

      {upcoming && (
        <View style={{ marginTop: 32, gap: 8 }}>
          <Button label="Продлить бронь" onPress={() => notify("Скоро", "Продление в разработке")} variant="secondary" />
          <Button label="Отменить" onPress={onCancel} variant="danger" loading={cancel.isPending} />
        </View>
      )}
    </ScrollView>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v}>{v}</Text>
    </View>
  );
}

function labelOf(s: string) {
  return ({ new: "Новая", confirmed: "Подтверждена", active: "Активна", completed: "Завершена", cancelled: "Отменена" } as const)[s as "new"] ?? s;
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#1F2430" },
  back: { color: "#8a8580", fontSize: 14, marginBottom: 18 },
  hero: { backgroundColor: "#2D3039", padding: 22, borderRadius: 16, marginBottom: 18 },
  airport: { color: "#3FB8AF", fontSize: 12, letterSpacing: 3, fontWeight: "600", textTransform: "uppercase" },
  dates: { color: "#fff", fontSize: 20, fontWeight: "300", marginTop: 8 },
  price: { color: "#fff", fontSize: 40, fontWeight: "200", marginTop: 4 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginTop: 12 },
  pillUpcoming: { backgroundColor: "rgba(255,107,74,0.15)" },
  pillDone: { backgroundColor: "rgba(63,184,175,0.15)" },
  pillTxt: { fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2D3039" },
  k: { color: "#8a8580", fontSize: 13 },
  v: { color: "#fff", fontSize: 13, fontWeight: "500" },
  err: { flex: 1, color: "#FF6B4A", textAlign: "center", marginTop: 100 },
});
