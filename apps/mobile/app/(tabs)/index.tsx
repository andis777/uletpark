import { useState, useMemo } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { previewCalc } from "@/lib/api";
import { Button } from "@/components/Button";
import { analytics } from "@/lib/analytics";
import type { Airport } from "@uletnaya/shared";

export default function Home() {
  const [airport, setAirport] = useState<Airport>("SVO");
  const [days, setDays] = useState("7");

  const { dateFrom, dateTo } = useMemo(() => {
    const f = new Date(); f.setHours(10, 0, 0, 0); f.setDate(f.getDate() + 1);
    const t = new Date(f); t.setDate(t.getDate() + (parseInt(days) || 0));
    return { dateFrom: f, dateTo: t };
  }, [days]);

  const { data: calc } = useQuery({
    queryKey: ["preview", airport, dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: () => previewCalc({ airport, dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() }),
    enabled: (parseInt(days) || 0) > 0,
  });

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 100 }}>
      <Text style={s.brand}>Улётная парковка</Text>
      <Text style={s.h1}>Парковка{"\n"}у трёх аэропортов</Text>
      <Text style={s.lede}>От 150 ₽/сут · бесплатный трансфер · охрана 24/7</Text>

      <View style={s.calc}>
        <Text style={s.calcTitle}>Калькулятор</Text>
        <View style={s.airports}>
          {(["SVO", "DME", "VKO"] as const).map(a => (
            <TouchableOpacity key={a} style={[s.airport, airport === a && s.airportActive]} onPress={() => setAirport(a)}>
              <Text style={[s.airportTxt, airport === a && s.airportTxtActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.label}>Сколько дней</Text>
        <TextInput style={s.input} value={days} onChangeText={setDays} keyboardType="number-pad" maxLength={3} />
        <View style={s.totalBox}>
          <Text style={s.totalLabel}>Итого</Text>
          <Text style={s.total}>{calc ? `${calc.finalRub.toLocaleString("ru")} ₽` : "—"}</Text>
        </View>
        <Button label="Забронировать" onPress={() => { analytics.bookingStarted(); router.push("/booking/new"); }} />
      </View>

      <View style={s.benefits}>
        <Benefit icon="✈" t="3 аэропорта" h="Шереметьево, Домодедово, Внуково" />
        <Benefit icon="🚐" t="Трансфер 24/7" h="5–10 минут до терминала" />
        <Benefit icon="🛡" t="Договор хранения" h="100% юридическая гарантия" />
        <Benefit icon="⏱" t="2 часа бесплатно" h="При задержке рейса" />
      </View>
    </ScrollView>
  );
}

function Benefit({ icon, t, h }: { icon: string; t: string; h: string }) {
  return (
    <View style={s.benefit}>
      <Text style={s.benefitIco}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.benefitTitle}>{t}</Text>
        <Text style={s.benefitHint}>{h}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#1F2430" },
  brand: { color: "#3FB8AF", fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 },
  h1: { color: "#fff", fontSize: 36, fontWeight: "300", lineHeight: 42, marginBottom: 12 },
  lede: { color: "#8a8580", fontSize: 14, marginBottom: 32 },
  calc: { backgroundColor: "#2D3039", padding: 20, borderRadius: 16 },
  calcTitle: { color: "#fff", fontSize: 18, fontWeight: "500", marginBottom: 16 },
  airports: { flexDirection: "row", gap: 8, marginBottom: 16 },
  airport: { flex: 1, backgroundColor: "#1F2430", padding: 14, borderRadius: 10, alignItems: "center" },
  airportActive: { backgroundColor: "#3FB8AF" },
  airportTxt: { color: "#8a8580", fontSize: 14, fontWeight: "600" },
  airportTxtActive: { color: "#1F2430" },
  label: { color: "#8a8580", fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: "#1F2430", color: "#fff", padding: 14, borderRadius: 10, fontSize: 18, marginBottom: 16 },
  totalBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  totalLabel: { color: "#8a8580", fontSize: 14 },
  total: { color: "#fff", fontSize: 28, fontWeight: "300" },
  benefits: { marginTop: 32, gap: 12 },
  benefit: { flexDirection: "row", alignItems: "center", backgroundColor: "#2D3039", padding: 16, borderRadius: 12, gap: 12 },
  benefitIco: { fontSize: 24 },
  benefitTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  benefitHint: { color: "#8a8580", fontSize: 11, marginTop: 2 },
});
