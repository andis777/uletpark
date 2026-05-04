import { useState, useMemo, useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, TextInput, TouchableOpacity, Alert, Switch } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createBooking, previewCalc, getLoyalty } from "@/lib/api";
import { Button } from "@/components/Button";
import { analytics } from "@/lib/analytics";
import type { Airport } from "@uletnaya/shared";

function todayPlus(days: number) {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export default function NewBooking() {
  const [airport, setAirport] = useState<Airport>("SVO");
  const [days, setDays] = useState("7");
  const [carNumber, setCarNumber] = useState("");
  const [carModel, setCarModel] = useState("");
  const [usePoints, setUsePoints] = useState(false);

  useEffect(() => { analytics.screenView("booking_new"); analytics.calcStarted(); }, []);

  const dateFrom = useMemo(() => todayPlus(1), []);
  const dateTo = useMemo(() => todayPlus(1 + (parseInt(days) || 1)), [days]);

  const { data: loyalty } = useQuery({ queryKey: ["loyalty"], queryFn: getLoyalty });
  const availablePoints = loyalty?.points ?? 0;

  const { data: calc } = useQuery({
    queryKey: ["calc", airport, dateFrom.toISOString(), dateTo.toISOString(), usePoints, availablePoints],
    queryFn: () => previewCalc({
      airport,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      useLoyaltyPoints: usePoints ? availablePoints : 0,
    }),
  });

  const create = useMutation({
    mutationFn: () => createBooking({
      airport,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      carNumber: carNumber.trim().toUpperCase(),
      carModel: carModel.trim() || undefined,
      useLoyaltyPoints: usePoints ? availablePoints : 0,
    }),
    onSuccess: (r) => {
      analytics.bookingCreated({ airport, days: parseInt(days), priceRub: r.booking.priceRub, pointsUsed: r.booking.pointsUsed });
      const usedTxt = r.booking.pointsUsed > 0 ? `\nИспользовано: ${r.booking.pointsUsed} баллов` : "";
      Alert.alert("Бронь создана", `Цена: ${r.booking.priceRub} ₽${usedTxt}`, [
        { text: "ОК", onPress: () => router.replace(`/booking/${r.booking.id}`) },
      ]);
    },
    onError: (e: Error) => Alert.alert("Ошибка", e.message),
  });

  const canSubmit = carNumber.trim().length >= 3 && (parseInt(days) || 0) > 0;
  const willUse = usePoints ? Math.min(availablePoints, calc?.totalRub ?? 0) : 0;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <View style={s.row}>
        <Text style={s.h1}>Новая бронь</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.close}>✕</Text></TouchableOpacity>
      </View>

      <Text style={s.label}>Аэропорт</Text>
      <View style={s.airports}>
        {(["SVO", "DME", "VKO"] as const).map(a => (
          <TouchableOpacity key={a} style={[s.airport, airport === a && s.airportActive]} onPress={() => setAirport(a)}>
            <Text style={[s.airportTxt, airport === a && s.airportTxtActive]}>{a}</Text>
            <Text style={[s.airportLabel, airport === a && { color: "#1F2430", opacity: 0.7 }]}>
              {a === "SVO" ? "Шереметьево" : a === "DME" ? "Домодедово" : "Внуково"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Сколько дней</Text>
      <TextInput style={s.input} value={days} onChangeText={setDays} keyboardType="number-pad" maxLength={3} />
      <Text style={s.helper}>{fmtDate(dateFrom)} → {fmtDate(dateTo)}</Text>

      <Text style={s.label}>Номер машины</Text>
      <TextInput
        style={s.input}
        value={carNumber}
        onChangeText={setCarNumber}
        placeholder="А123БВ77"
        placeholderTextColor="#5a5d65"
        autoCapitalize="characters"
      />

      <Text style={s.label}>Модель (необязательно)</Text>
      <TextInput
        style={s.input}
        value={carModel}
        onChangeText={setCarModel}
        placeholder="Toyota Camry"
        placeholderTextColor="#5a5d65"
      />

      {availablePoints > 0 && (
        <View style={s.redeemBox}>
          <View style={s.redeemRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.redeemLabel}>Использовать баллы</Text>
              <Text style={s.redeemHint}>Доступно: {availablePoints.toLocaleString("ru")} ₽</Text>
            </View>
            <Switch
              value={usePoints}
              onValueChange={setUsePoints}
              trackColor={{ false: "#1F2430", true: "#3FB8AF" }}
              thumbColor="#fff"
            />
          </View>
          {usePoints && willUse > 0 && (
            <Text style={s.redeemUse}>Будет списано: {willUse.toLocaleString("ru")} баллов</Text>
          )}
        </View>
      )}

      <View style={s.summary}>
        <View style={s.sumRow}>
          <Text style={s.sumLabel}>Дней</Text>
          <Text style={s.sumValue}>{calc?.days ?? "—"}</Text>
        </View>
        <View style={s.sumRow}>
          <Text style={s.sumLabel}>Цена за сутки</Text>
          <Text style={s.sumValue}>{calc?.pricePerDayRub ?? "—"} ₽</Text>
        </View>
        {calc?.discountRub ? (
          <View style={s.sumRow}>
            <Text style={s.sumLabel}>Промокод</Text>
            <Text style={[s.sumValue, { color: "#3FB8AF" }]}>−{calc.discountRub} ₽</Text>
          </View>
        ) : null}
        {calc?.loyaltyDiscountRub ? (
          <View style={s.sumRow}>
            <Text style={s.sumLabel}>Баллы</Text>
            <Text style={[s.sumValue, { color: "#3FB8AF" }]}>−{calc.loyaltyDiscountRub} ₽</Text>
          </View>
        ) : null}
        <View style={[s.sumRow, s.sumTotal]}>
          <Text style={s.sumTotalLabel}>Итого</Text>
          <Text style={s.sumTotalValue}>{calc?.finalRub ?? "—"} ₽</Text>
        </View>
        {calc && calc.pointsToEarn > 0 && (
          <Text style={s.bonus}>+ {calc.pointsToEarn} баллов на счёт</Text>
        )}
      </View>

      <Button
        label={`Забронировать за ${calc?.finalRub ?? "—"} ₽`}
        onPress={() => create.mutate()}
        loading={create.isPending}
        disabled={!canSubmit}
        style={{ marginBottom: 12 }}
      />
      <Text style={s.legal}>Нажимая, соглашаюсь с офертой и обработкой персональных данных</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#1F2430" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  h1: { color: "#fff", fontSize: 28, fontWeight: "300" },
  close: { color: "#8a8580", fontSize: 24, padding: 8 },
  label: { color: "#8a8580", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: 16, marginBottom: 8 },
  airports: { flexDirection: "row", gap: 8 },
  airport: { flex: 1, backgroundColor: "#2D3039", padding: 14, borderRadius: 10, alignItems: "center" },
  airportActive: { backgroundColor: "#3FB8AF" },
  airportTxt: { color: "#8a8580", fontSize: 16, fontWeight: "700" },
  airportTxtActive: { color: "#1F2430" },
  airportLabel: { color: "#5a5d65", fontSize: 9, marginTop: 2 },
  input: { backgroundColor: "#2D3039", color: "#fff", padding: 14, borderRadius: 10, fontSize: 16 },
  helper: { color: "#5a5d65", fontSize: 12, marginTop: 6 },
  redeemBox: { backgroundColor: "rgba(63,184,175,0.08)", borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: "rgba(63,184,175,0.25)" },
  redeemRow: { flexDirection: "row", alignItems: "center" },
  redeemLabel: { color: "#fff", fontSize: 14, fontWeight: "500" },
  redeemHint: { color: "#3FB8AF", fontSize: 11, marginTop: 2 },
  redeemUse: { color: "#3FB8AF", fontSize: 12, marginTop: 8 },
  summary: { backgroundColor: "#2D3039", padding: 18, borderRadius: 14, marginTop: 24 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  sumLabel: { color: "#8a8580", fontSize: 13 },
  sumValue: { color: "#fff", fontSize: 14, fontWeight: "500" },
  sumTotal: { borderTopWidth: 1, borderTopColor: "#1F2430", paddingTop: 12, marginTop: 6, marginBottom: 0 },
  sumTotalLabel: { color: "#8a8580", fontSize: 14 },
  sumTotalValue: { color: "#fff", fontSize: 26, fontWeight: "300" },
  bonus: { color: "#3FB8AF", fontSize: 12, textAlign: "right", marginTop: 8 },
  legal: { color: "#5a5d65", fontSize: 10, textAlign: "center", lineHeight: 16, marginTop: 4, marginBottom: 24 },
});
