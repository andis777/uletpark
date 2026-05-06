import { useState, useEffect, useMemo } from "react";
import { ScrollView, Text, View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { createBooking } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { colors, fonts, radii, spacing } from "@/lib/theme";

const TARIFFS = [
  { hours: 6 as const, price: 500, label: "6 часов", lede: "Поспать или дождаться рейса" },
  { hours: 12 as const, price: 800, label: "12 часов", lede: "Полноценный отдых перед длинным перелётом" },
  { hours: 24 as const, price: 1200, label: "Сутки", lede: "С трансфером — выгоднее парковки в аэропорту" },
];

const STEPS = ["Тариф", "Дата", "Готово"] as const;

function formatDateInput(d: Date): string { return d.toISOString().slice(0, 10); }
function parseDateInput(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  if (!y || !m || !day) return new Date();
  return new Date(y, m - 1, day, 14, 0, 0);
}

export default function NochevkaWizard() {
  const [step, setStep] = useState(0);
  const [hours, setHours] = useState<6 | 12 | 24>(6);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setHours(14, 0, 0, 0); d.setDate(d.getDate() + 1); return d; });
  const [carNumber, setCarNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { analytics.screenView("booking_nochevka"); }, []);

  const tariff = useMemo(() => TARIFFS.find(t => t.hours === hours)!, [hours]);
  const dateTo = useMemo(() => new Date(dateFrom.getTime() + hours * 3600_000), [dateFrom, hours]);

  const create = useMutation({
    mutationFn: () => createBooking({
      airport: "SVO", // ночёвка только у Шереметьево
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      carNumber: carNumber.trim().toUpperCase() || "БЕЗ АВТО",
      notes: `Улётная ночёвка · ${tariff.label} · ${tariff.price} ₽`,
    }),
    onSuccess: (r) => {
      analytics.bookingCreated({ airport: "SVO", days: 1, priceRub: tariff.price });
      router.replace(`/booking/${r.booking.id}`);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : router.back()}>
          <Text style={s.back}>← {step === 0 ? "На главную" : STEPS[step - 1]}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Улётная ночёвка</Text>
        <View style={{ width: 80 }} />
      </View>

      <View style={s.stepper}>
        {STEPS.map((label, i) => (
          <View key={label} style={s.stepItem}>
            <View style={[s.stepDot, i <= step && s.stepDotActive, i === step && s.stepDotCurrent]}>
              <Text style={[s.stepDotTxt, i <= step && { color: colors.textOnDark }]}>{i + 1}</Text>
            </View>
            <Text style={[s.stepLabel, i === step && s.stepLabelCurrent]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={s.body} contentContainerStyle={{ padding: spacing.xl }}>
        {/* STEP 0 — Тариф */}
        {step === 0 && (
          <>
            <Text style={s.title}>Сколько времени отдыхаем?</Text>
            <Text style={s.lede}>У нас номера у аэропорта Шереметьево. Душ, чай-кофе, Wi-Fi — всё включено.</Text>
            <View style={{ marginTop: spacing.xl }}>
              {TARIFFS.map(t => (
                <TouchableOpacity
                  key={t.hours}
                  style={[s.tariffCard, hours === t.hours && s.tariffCardActive]}
                  onPress={() => setHours(t.hours)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tariffTitle, hours === t.hours && { color: colors.textOnDark }]}>{t.label}</Text>
                    <Text style={[s.tariffLede, hours === t.hours && { color: colors.textOnDark, opacity: 0.85 }]}>{t.lede}</Text>
                  </View>
                  <Text style={[s.tariffPrice, hours === t.hours && { color: colors.textOnDark }]}>{t.price} ₽</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* STEP 1 — Дата */}
        {step === 1 && (
          <>
            <Text style={s.title}>Когда заселяемся?</Text>
            <Text style={s.lede}>Заезд с 14:00. Выезд — через {hours} часов.</Text>

            <Text style={s.label}>Дата заезда</Text>
            <TextInput
              style={s.input}
              value={formatDateInput(dateFrom)}
              onChangeText={(v) => setDateFrom(parseDateInput(v))}
              placeholder="ГГГГ-ММ-ДД"
              {...({ type: "date" } as any)}
            />

            <Text style={s.label}>Гос.номер машины (необязательно — если приедете на машине)</Text>
            <TextInput
              style={s.input}
              value={carNumber}
              onChangeText={setCarNumber}
              placeholder="А123БВ77"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              maxLength={15}
            />

            <View style={s.timeBox}>
              <Text style={s.timeLabel}>Заезд:</Text>
              <Text style={s.timeValue}>{dateFrom.toLocaleString("ru", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
            <View style={s.timeBox}>
              <Text style={s.timeLabel}>Выезд:</Text>
              <Text style={s.timeValue}>{dateTo.toLocaleString("ru", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          </>
        )}

        {/* STEP 2 — Готово */}
        {step === 2 && (
          <>
            <Text style={s.title}>Проверьте детали</Text>
            <Text style={s.lede}>Подтвердите — мы свяжемся для уточнения комнаты</Text>

            <View style={s.summary}>
              <SummaryRow k="Услуга" v="Улётная ночёвка" />
              <SummaryRow k="Где" v="Шереметьево" />
              <SummaryRow k="Тариф" v={tariff.label} />
              <SummaryRow k="Заезд" v={dateFrom.toLocaleString("ru", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} />
              <SummaryRow k="Выезд" v={dateTo.toLocaleString("ru", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} />
              {carNumber && <SummaryRow k="Машина" v={carNumber.toUpperCase()} />}
              <View style={s.divider} />
              <View style={[s.summaryRow, { paddingVertical: spacing.md }]}>
                <Text style={s.totalLabel}>К оплате</Text>
                <Text style={s.totalValue}>{tariff.price.toLocaleString("ru")} ₽</Text>
              </View>
            </View>

            <Text style={s.note}>
              💡 В стоимость входит: душ, чай / кофе, Wi-Fi, смена белья, безопасное хранение вещей. Бесплатный трансфер до терминала.
            </Text>

            {error && <Text style={s.error}>{error}</Text>}
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        {step < 2 ? (
          <TouchableOpacity style={s.cta} onPress={() => setStep(step + 1)}>
            <Text style={s.ctaTxt}>Дальше · {STEPS[step + 1]}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.cta, create.isPending && s.ctaDisabled]}
            onPress={() => create.mutate()}
            disabled={create.isPending}
          >
            {create.isPending
              ? <ActivityIndicator color={colors.textOnDark} />
              : <Text style={s.ctaTxt}>Забронировать за {tariff.price.toLocaleString("ru")} ₽</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryK}>{k}</Text>
      <Text style={s.summaryV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.graphite, paddingHorizontal: spacing.xl, paddingTop: 48, paddingBottom: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  headerTitle: { color: colors.textOnDark, fontSize: 14, fontWeight: "500" },

  stepper: { flexDirection: "row", backgroundColor: colors.graphite, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  stepItem: { flex: 1, alignItems: "center" },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotCurrent: { backgroundColor: colors.primary, transform: [{ scale: 1.15 }] },
  stepDotTxt: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  stepLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "500" },
  stepLabelCurrent: { color: colors.textOnDark, fontWeight: "700" },

  body: { flex: 1, backgroundColor: colors.surface },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "300", fontFamily: fonts.heading, marginBottom: spacing.sm },
  lede: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700", textTransform: "uppercase", marginTop: spacing.md, marginBottom: spacing.sm },

  tariffCard: { backgroundColor: colors.surfaceMuted, padding: spacing.lg, borderRadius: radii.md, flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, borderWidth: 2, borderColor: "transparent" },
  tariffCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tariffTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "600" },
  tariffLede: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  tariffPrice: { color: colors.primary, fontSize: 20, fontWeight: "700" },

  input: { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, padding: spacing.md, borderRadius: radii.md, fontSize: 16, borderWidth: 1, borderColor: colors.border },

  timeBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceMuted, padding: spacing.md, borderRadius: radii.md, marginTop: spacing.sm },
  timeLabel: { color: colors.textSecondary, fontSize: 12 },
  timeValue: { color: colors.textPrimary, fontSize: 14, fontWeight: "500" },

  summary: { backgroundColor: colors.surfaceMuted, padding: spacing.lg, borderRadius: radii.md },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryK: { color: colors.textSecondary, fontSize: 13 },
  summaryV: { color: colors.textPrimary, fontSize: 13, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  totalValue: { color: colors.primary, fontSize: 26, fontWeight: "700", fontFamily: fonts.heading },

  note: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfacePaper, borderRadius: radii.sm },

  error: { color: colors.danger, backgroundColor: colors.dangerBg, padding: spacing.md, borderRadius: radii.sm, marginTop: spacing.md, fontSize: 13 },

  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface },
  cta: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radii.md, alignItems: "center", minHeight: 52, justifyContent: "center" },
  ctaDisabled: { opacity: 0.5 },
  ctaTxt: { color: colors.textOnDark, fontSize: 15, fontWeight: "700" },
});
