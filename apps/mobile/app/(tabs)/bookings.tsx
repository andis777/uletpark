import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from "react-native";
import { router } from "expo-router";
import { listBookings, syncMyBookings } from "@/lib/api";
import { colors, typography, radii, spacing } from "@/lib/theme";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { EmptyState } from "@/components/EmptyState";

const TAB_BAR_GAP = 100;

export default function Bookings() {
  const qc = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["bookings"],
    queryFn: listBookings,
  });

  // Sync с amoCRM (один раз при mount + при pull-to-refresh)
  const sync = useMutation({
    mutationFn: syncMyBookings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  useEffect(() => {
    // При первом открытии — подтянуть свежие лиды amoCRM в нашу БД
    sync.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    await sync.mutateAsync().catch(() => {});
    await refetch();
  };

  const isSyncing = sync.isPending;

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={{ paddingBottom: TAB_BAR_GAP }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching || isSyncing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={s.header}>
        <View>
          <Text style={s.brand}>МОИ БРОНИ</Text>
          <Text style={s.title}>
            {data?.bookings.length ?? 0}
            <Text style={s.titleUnit}>  {pluralBookings(data?.bookings.length ?? 0)}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)")} style={s.addBtn}>
          <Text style={s.addBtnTxt}>+ Новая</Text>
        </TouchableOpacity>
      </View>

      <View style={s.body}>
        {isSyncing && (
          <View style={s.syncRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={s.syncTxt}>Загрузка из amoCRM...</Text>
          </View>
        )}
        {sync.data && !isSyncing && sync.data.linkedBookings > 0 && (
          <View style={s.syncRowOk}>
            <Text style={s.syncTxtOk}>✓ Подгружено {sync.data.linkedBookings} {pluralBookings(sync.data.linkedBookings)} из amoCRM</Text>
          </View>
        )}

        {isLoading && !data && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
        {error && <Text style={s.err}>Не удалось загрузить</Text>}

        {data?.bookings.map(b => {
          const isUpcoming = b.status === "new" || b.status === "confirmed" || b.status === "active";
          return (
            <Card
              key={b.id}
              variant="elevated"
              onPress={() => router.push(`/booking/${b.id}`)}
              padding="lg"
              style={{ marginBottom: spacing.md }}
            >
              <View style={s.cardHead}>
                <View style={s.airportBox}>
                  <Text style={s.airportIco}>✈</Text>
                  <Text style={s.airport}>{b.airport}</Text>
                </View>
                <Pill label={statusLabel(b.status)} tone={statusTone(b.status)} />
              </View>

              <Text style={s.dates}>
                {new Date(b.dateFrom).toLocaleDateString("ru", { day: "numeric", month: "long" })}
                <Text style={s.datesArrow}>  →  </Text>
                {new Date(b.dateTo).toLocaleDateString("ru", { day: "numeric", month: "long" })}
              </Text>

              {(b.carNumber || b.carModel) && (
                <Text style={s.car}>
                  {b.carNumber ?? "—"} {b.carModel ? `· ${b.carModel}` : ""}
                </Text>
              )}

              {b.source === "amocrm" && (
                <Text style={s.source}>amoCRM #{b.id.slice(0, 6)}</Text>
              )}

              <View style={s.cardFoot}>
                <Text style={s.price}>{b.priceRub.toLocaleString("ru")} ₽</Text>
                {isUpcoming && b.loyaltyPointsEarned > 0 && (
                  <Text style={s.bonus}>+{b.loyaltyPointsEarned} баллов</Text>
                )}
                {!isUpcoming && b.loyaltyPointsEarned > 0 && (
                  <Text style={s.bonusDone}>+{b.loyaltyPointsEarned} начислено</Text>
                )}
              </View>
            </Card>
          );
        })}

        {!isLoading && data?.bookings.length === 0 && (
          <EmptyState
            icon="🅿️"
            title="Пока нет броней"
            description="Здесь появятся ваши парковки и ночёвки. Можно создать новую — на главной два сервиса."
            action={
              <TouchableOpacity style={s.cta} onPress={() => router.push("/(tabs)")}>
                <Text style={s.ctaTxt}>На главную</Text>
              </TouchableOpacity>
            }
          />
        )}
      </View>
    </ScrollView>
  );
}

function pluralBookings(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "броней";
  if (mod10 === 1) return "бронь";
  if (mod10 >= 2 && mod10 <= 4) return "брони";
  return "броней";
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
  wrap: { flex: 1, backgroundColor: colors.surface },

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
  title: { color: colors.textOnDark, fontSize: 26, fontWeight: "300", fontFamily: typography.displaySm.fontFamily },
  titleUnit: { fontSize: 14, opacity: 0.85, fontWeight: "400" },

  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radii.pill },
  addBtnTxt: { color: colors.textOnDark, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  body: { padding: spacing.xl },

  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  syncTxt: { color: colors.primary, fontSize: 13, fontWeight: "600" },

  syncRowOk: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.successBg, borderRadius: radii.md, marginBottom: spacing.md },
  syncTxtOk: { color: colors.success, fontSize: 12, fontWeight: "600" },

  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  airportBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  airportIco: { fontSize: 16, color: colors.primary },
  airport: { color: colors.primary, fontSize: 18, fontWeight: "700", letterSpacing: 1 },

  dates: { color: colors.textPrimary, fontSize: 16, marginBottom: 4, fontWeight: "500" },
  datesArrow: { color: colors.textMuted, fontWeight: "400" },
  car: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  source: { color: colors.textMuted, fontSize: 10, fontFamily: "monospace", marginBottom: spacing.sm },

  cardFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: spacing.sm },
  price: { color: colors.textPrimary, fontSize: 22, fontWeight: "300", fontFamily: typography.displaySm.fontFamily },
  bonus: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  bonusDone: { color: colors.success, fontSize: 12, fontWeight: "600" },

  err: { color: colors.danger, marginTop: 24, textAlign: "center" },

  cta: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.md },
  ctaTxt: { color: colors.textOnDark, fontSize: 14, fontWeight: "700" },
});
