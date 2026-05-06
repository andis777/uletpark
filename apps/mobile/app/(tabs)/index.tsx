import { useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getMe, getLoyalty, listBookings } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { colors, fonts, radii, spacing } from "@/lib/theme";

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

  const firstName = me?.user.firstName || "клиент";
  const upcoming = bookings?.bookings.filter(b =>
    b.status === "new" || b.status === "confirmed" || b.status === "active"
  ) ?? [];

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      {/* Header — графитовая шапка */}
      <View style={s.header}>
        <View>
          <Text style={s.brand}>✈ Улётная парковка</Text>
          <Text style={s.welcome}>Привет, {firstName}!</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={s.avatar}>
          <Text style={s.avatarTxt}>{firstName[0]?.toUpperCase() ?? "?"}</Text>
        </TouchableOpacity>
      </View>

      {/* Карточка лояльности */}
      <View style={s.loyCard}>
        <View>
          <Text style={s.loyLabel}>{(loyalty?.tier ?? me?.user.loyaltyTier ?? "bronze").toUpperCase()}</Text>
          <Text style={s.loyPoints}>
            {(loyalty?.points ?? me?.user.loyaltyPoints ?? 0).toLocaleString("ru")}
            <Text style={s.loyPointsUnit}> баллов</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/loyalty")}>
          <Text style={s.loyLink}>Подробнее →</Text>
        </TouchableOpacity>
      </View>

      {/* Два больших CTA — Парковка и Ночёвка */}
      <Text style={s.sectionTitle}>Что бронируем?</Text>

      <TouchableOpacity style={s.serviceCard} onPress={() => router.push("/booking/parking")} activeOpacity={0.85}>
        <View style={s.serviceIcoBox}>
          <Text style={s.serviceIco}>🅿️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.serviceTitle}>Парковка у Шереметьево</Text>
          <Text style={s.serviceLede}>От 150 ₽/сутки · бесплатный трансфер 24/7</Text>
        </View>
        <Text style={s.serviceArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.serviceCard} onPress={() => router.push("/booking/nochevka")} activeOpacity={0.85}>
        <View style={[s.serviceIcoBox, { backgroundColor: colors.surfacePaper }]}>
          <Text style={s.serviceIco}>🛏️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.serviceTitle}>Улётная ночёвка</Text>
          <Text style={s.serviceLede}>6 ч — 500 ₽ · 12 ч — 800 ₽ · сутки — 1200 ₽</Text>
        </View>
        <Text style={s.serviceArrow}>›</Text>
      </TouchableOpacity>

      {/* Активные брони (если есть) */}
      {upcoming.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Активные брони</Text>
          {upcoming.slice(0, 3).map(b => (
            <TouchableOpacity key={b.id} style={s.bookCard} onPress={() => router.push(`/booking/${b.id}`)}>
              <View style={s.bookHead}>
                <Text style={s.bookAirport}>{b.airport}</Text>
                <Text style={s.bookPrice}>{b.priceRub.toLocaleString("ru")} ₽</Text>
              </View>
              <Text style={s.bookDates}>
                {new Date(b.dateFrom).toLocaleDateString("ru")} → {new Date(b.dateTo).toLocaleDateString("ru")}
              </Text>
              {b.carNumber && <Text style={s.bookCar}>{b.carNumber}</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => router.push("/(tabs)/bookings")} style={s.allBtn}>
            <Text style={s.allBtnTxt}>Все брони →</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={s.footerSpace} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  loadingWrap: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 100 },

  header: {
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { color: colors.primary, fontSize: 11, letterSpacing: 3, fontWeight: "700", marginBottom: 6 },
  welcome: { color: colors.textOnDark, fontSize: 24, fontWeight: "300", fontFamily: fonts.heading },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  avatarTxt: { color: colors.textOnDark, fontSize: 18, fontWeight: "700" },

  loyCard: {
    backgroundColor: colors.primary,
    margin: spacing.xl,
    marginTop: -spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loyLabel: { color: colors.graphite, fontSize: 10, letterSpacing: 3, fontWeight: "800", marginBottom: 4 },
  loyPoints: { color: colors.textOnDark, fontSize: 28, fontWeight: "300", fontFamily: fonts.heading },
  loyPointsUnit: { fontSize: 13, opacity: 0.85 },
  loyLink: { color: colors.textOnDark, fontSize: 12, fontWeight: "600" },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  serviceIcoBox: {
    width: 56, height: 56, borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center", alignItems: "center",
    marginRight: spacing.md,
  },
  serviceIco: { fontSize: 28 },
  serviceTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "600", marginBottom: 4, fontFamily: fonts.heading },
  serviceLede: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  serviceArrow: { color: colors.primary, fontSize: 28, marginLeft: spacing.sm, fontWeight: "300" },

  bookCard: {
    backgroundColor: colors.surfaceMuted,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  bookHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  bookAirport: { color: colors.primary, fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  bookPrice: { color: colors.textPrimary, fontSize: 16, fontWeight: "500" },
  bookDates: { color: colors.textPrimary, fontSize: 13 },
  bookCar: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  allBtn: { padding: spacing.md, alignItems: "center" },
  allBtnTxt: { color: colors.primary, fontSize: 13, fontWeight: "600" },

  footerSpace: { height: spacing.xxxl },
});
