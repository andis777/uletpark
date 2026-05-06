import { useLocalSearchParams, router } from "expo-router";
import { Platform } from "react-native";

function goBack() {
  if (router.canGoBack?.()) {
    router.back();
  } else {
    router.replace("/(tabs)/bookings");
  }
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, View, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { getBooking, cancelBooking } from "@/lib/api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Pill } from "@/components/Pill";
import { confirmAction, notify } from "@/lib/ui";
import { colors, typography, fonts, radii, spacing } from "@/lib/theme";

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

  if (isLoading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={s.loadingWrap}>
        <Text style={s.err}>Не удалось загрузить бронь</Text>
        <TouchableOpacity onPress={goBack}><Text style={s.backLink}>← Назад</Text></TouchableOpacity>
      </View>
    );
  }

  const b = data.booking;
  const upcoming = b.status === "new" || b.status === "confirmed" || b.status === "active";

  return (
    <View style={s.wrap}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack}>
          <Text style={s.back}>← Все брони</Text>
        </TouchableOpacity>
        <Text style={s.headerEyebrow}>УЛЁТНАЯ ПАРКОВКА</Text>
        <Text style={s.headerTitle}>
          {b.airport === "SVO" ? "Шереметьево" : b.airport === "DME" ? "Домодедово" : "Внуково"}
        </Text>
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }}>
        {/* Hero */}
        <Card variant="elevated" padding="xl" style={{ marginBottom: spacing.lg }}>
          <View style={s.heroTop}>
            <Pill label={statusLabel(b.status)} tone={statusTone(b.status)} />
            <Text style={s.bookNumber}>№ {b.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <Text style={s.dates}>
            {new Date(b.dateFrom).toLocaleDateString("ru", { day: "numeric", month: "long" })}
            <Text style={s.datesArrow}>  →  </Text>
            {new Date(b.dateTo).toLocaleDateString("ru", { day: "numeric", month: "long" })}
          </Text>
          <Text style={s.price}>{b.priceRub.toLocaleString("ru")} ₽</Text>
        </Card>

        {/* Details */}
        <Text style={s.sectionTitle}>ДЕТАЛИ</Text>
        <Card variant="muted" padding="lg">
          <Detail k="Машина" v={b.carNumber || "—"} />
          {b.carModel && <Detail k="Модель" v={b.carModel} />}
          {b.notes && <Detail k="Заметки" v={b.notes} last />}
        </Card>

        {/* Actions */}
        {upcoming && (
          <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
            <Button
              label="Продлить бронь"
              onPress={() => notify("Скоро", "Продление в разработке")}
              variant="secondary"
            />
            <Button
              label="Отменить"
              onPress={onCancel}
              variant="danger"
              loading={cancel.isPending}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Detail({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v}>{v}</Text>
    </View>
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
  wrap: { flex: 1, backgroundColor: colors.surface },
  loadingWrap: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center", gap: spacing.md },

  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  back: { color: colors.primary, fontSize: 13, fontWeight: "600", marginBottom: spacing.md },
  backLink: { color: colors.primary, fontSize: 14, fontWeight: "600", marginTop: spacing.md },

  headerEyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 3, fontWeight: "700", marginBottom: 6 },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "300",
    fontFamily: typography.displaySm.fontFamily,
  },

  body: { flex: 1, backgroundColor: colors.surface },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  bookNumber: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fonts.mono,
    letterSpacing: 1,
  },

  dates: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  datesArrow: { color: colors.textMuted, fontWeight: "400" },

  price: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: "300",
    fontFamily: typography.displaySm.fontFamily,
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  k: { color: colors.textSecondary, fontSize: 14 },
  v: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },

  err: { color: colors.danger, fontSize: 14, textAlign: "center" },
});
