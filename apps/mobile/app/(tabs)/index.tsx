import { useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMe, getLoyalty, listBookings } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { colors, typography, radii, spacing } from "@/lib/theme";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { SectionHeader } from "@/components/SectionHeader";

const TAB_BAR_GAP = 100;

export default function Dashboard() {
  useEffect(() => { analytics.screenView("dashboard"); }, []);

  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: loyalty } = useQuery({ queryKey: ["loyalty"], queryFn: getLoyalty });
  const { data: bookings } = useQuery({ queryKey: ["bookings"], queryFn: listBookings });

  if (meLoading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const firstName = me?.user.firstName?.trim() || "Гость";
  const tier = loyalty?.tier ?? me?.user.loyaltyTier ?? "bronze";
  const points = loyalty?.points ?? me?.user.loyaltyPoints ?? 0;
  const upcoming = bookings?.bookings.filter(b =>
    b.status === "new" || b.status === "confirmed" || b.status === "active"
  ) ?? [];

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: TAB_BAR_GAP }}>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>✈ УЛЁТНАЯ ПАРКОВКА</Text>
          <Text style={s.welcome}>Привет, {firstName}!</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={s.avatar}>
          <Text style={s.avatarTxt}>{firstName[0]?.toUpperCase() ?? "Г"}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.heroWrap}>
        <View style={s.loyCard}>
          <View style={s.loyTopRow}>
            <Pill label={tier} tone="muted" />
            <TouchableOpacity onPress={() => router.push("/(tabs)/loyalty")}>
              <Text style={s.loyLink}>Подробнее →</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.loyPoints}>
            {points.toLocaleString("ru")}
            <Text style={s.loyPointsUnit}>  баллов</Text>
          </Text>
          <Text style={s.loyHint}>1 балл = 1 ₽ при следующей брони</Text>
        </View>
      </View>

      <View style={s.section}>
        <SectionHeader title="Что бронируем?" />

        <Card variant="elevated" onPress={() => router.push("/booking/parking")} padding="lg" style={s.serviceCard}>
          <View style={s.serviceIcoBox}>
            <Text style={s.serviceIco}>🅿️</Text>
          </View>
          <View style={s.serviceTextBox}>
            <Text style={s.serviceTitle}>Парковка у Шереметьево</Text>
            <Text style={s.serviceLede}>От 150 ₽/сут · трансфер 24/7</Text>
          </View>
          <View style={s.serviceArrow}>
            <Text style={s.arrowTxt}>›</Text>
          </View>
        </Card>

        <Card variant="elevated" onPress={() => router.push("/booking/nochevka")} padding="lg" style={s.serviceCard}>
          <View style={[s.serviceIcoBox, { backgroundColor: colors.surfacePaper }]}>
            <Text style={s.serviceIco}>🛏️</Text>
          </View>
          <View style={s.serviceTextBox}>
            <Text style={s.serviceTitle}>Улётная ночёвка</Text>
            <Text style={s.serviceLede}>6 ч · 12 ч · сутки</Text>
          </View>
          <View style={s.serviceArrow}>
            <Text style={s.arrowTxt}>›</Text>
          </View>
        </Card>
      </View>

      {upcoming.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            title="Активные брони"
            action={{ label: "Все", onPress: () => router.push("/(tabs)/bookings") }}
          />
          {upcoming.slice(0, 3).map(b => (
            <Card
              key={b.id}
              variant="muted"
              onPress={() => router.push(`/booking/${b.id}`)}
              padding="md"
              style={{ marginBottom: spacing.sm }}
            >
              <View style={s.bookHead}>
                <Text style={s.bookAirport}>{b.airport}</Text>
                <Pill label={statusLabel(b.status)} tone={statusTone(b.status)} />
              </View>
              <Text style={s.bookDates}>
                {new Date(b.dateFrom).toLocaleDateString("ru")} → {new Date(b.dateTo).toLocaleDateString("ru")}
              </Text>
              {b.carNumber && <Text style={s.bookCar}>{b.carNumber}</Text>}
              <Text style={s.bookPrice}>{b.priceRub.toLocaleString("ru")} ₽</Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function statusLabel(s: string) {
  return ({ new: "Новая", confirmed: "Подтверждена", active: "Активна", completed: "Завершена", cancelled: "Отменена" } as const)[s as "new"] ?? s;
}
function statusTone(s: string): "primary" | "success" | "muted" | "warning" {
  if (s === "completed") return "success";
  if (s === "cancelled") return "muted";
  if (s === "active") return "warning";
  return "primary";
}

const s = StyleSheet.create({
  loadingWrap: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  wrap: { flex: 1, backgroundColor: colors.surface },

  header: {
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { color: colors.primary, fontSize: 11, letterSpacing: 3, fontWeight: "700", marginBottom: 6 },
  welcome: { color: colors.textOnDark, fontSize: 26, fontWeight: "300", fontFamily: typography.displaySm.fontFamily },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  avatarTxt: { color: colors.textOnDark, fontSize: 18, fontWeight: "700" },

  heroWrap: { paddingHorizontal: spacing.xl, marginTop: -36 },
  loyCard: { backgroundColor: colors.primary, padding: spacing.xl, borderRadius: radii.xl },
  loyTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  loyLink: { color: colors.textOnDark, fontSize: 12, fontWeight: "700", opacity: 0.95 },
  loyPoints: { color: colors.textOnDark, fontSize: 36, fontWeight: "300", fontFamily: typography.displaySm.fontFamily },
  loyPointsUnit: { fontSize: 14, opacity: 0.85, fontWeight: "400" },
  loyHint: { color: colors.textOnDark, opacity: 0.85, fontSize: 12, marginTop: 4 },

  section: { paddingHorizontal: spacing.xl },

  serviceCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, gap: spacing.md },
  serviceIcoBox: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, justifyContent: "center", alignItems: "center" },
  serviceIco: { fontSize: 28 },
  serviceTextBox: { flex: 1 },
  serviceTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "600", marginBottom: 2, fontFamily: typography.h3.fontFamily },
  serviceLede: { color: colors.textMuted, fontSize: 12 },
  serviceArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, justifyContent: "center", alignItems: "center" },
  arrowTxt: { color: colors.primary, fontSize: 18, fontWeight: "700", lineHeight: 20 },

  bookHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  bookAirport: { color: colors.primary, fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  bookDates: { color: colors.textPrimary, fontSize: 14, marginBottom: 2 },
  bookCar: { color: colors.textMuted, fontSize: 11, marginBottom: 6 },
  bookPrice: { color: colors.textPrimary, fontSize: 18, fontWeight: "600", fontFamily: typography.displaySm.fontFamily },
});
