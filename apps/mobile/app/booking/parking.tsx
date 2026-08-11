import { useState, useMemo, useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { previewCalc, createBooking, getLoyalty, notifyWebLead } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { DatePickerField } from "@/components/DatePickerField";
import { RouteMapModal } from "@/components/RouteMapModal";
import { BookingSuccessModal } from "@/components/BookingSuccessModal";

const AIRPORT = "SVO" as const;
const AIRPORT_NAME = "Шереметьево";

function todayPlus(daysOffset: number) {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return d;
}

function formatDateInput(d: Date): string { return d.toISOString().slice(0, 10); }
function parseDateInput(s: string, hour = 10): Date {
  const [y, m, day] = s.split("-").map(Number);
  if (!y || !m || !day) return new Date();
  return new Date(y, m - 1, day, hour, 0, 0);
}

const STEPS = ["Даты", "Авто", "Готово"] as const;

export default function ParkingWizard() {
  const [step, setStep] = useState(0);
  const [dateFrom, setDateFrom] = useState(todayPlus(1));
  const [dateTo, setDateTo] = useState(todayPlus(8));
  const [carNumber, setCarNumber] = useState("");
  const [carModel, setCarModel] = useState("");
  const [email, setEmail] = useState("");
  const [usePoints, setUsePoints] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string>("");
  const [createdPrice, setCreatedPrice] = useState(0);
  const [createdName, setCreatedName] = useState("");

  useEffect(() => { analytics.screenView("booking_parking"); analytics.calcStarted(); }, []);

  const { data: loyalty } = useQuery({ queryKey: ["loyalty"], queryFn: getLoyalty });
  const availablePoints = loyalty?.points ?? 0;

  const { data: calc } = useQuery({
    queryKey: ["calc", "parking", dateFrom.toISOString(), dateTo.toISOString(), usePoints, availablePoints],
    queryFn: () => previewCalc({
      airport: AIRPORT,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      service: "parking",
      useLoyaltyPoints: usePoints ? availablePoints : 0,
    }),
  });

  const create = useMutation({
    mutationFn: () => createBooking({
      airport: AIRPORT,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      carNumber: carNumber.trim().toUpperCase(),
      carModel: carModel.trim() || undefined,
      email: email.trim() || undefined,
      useLoyaltyPoints: usePoints ? availablePoints : 0,
    }),
    onSuccess: (r) => {
      analytics.bookingCreated({ airport: AIRPORT, days: calc?.days ?? 0, priceRub: r.booking.priceRub });
      // Зеркалим заявку в MAX/лог как заявку из приложения (fire-and-forget, не блокирует UI)
      void notifyWebLead({
        dateFrom: formatDateInput(dateFrom),
        dateTo: formatDateInput(dateTo),
        price: r.booking.priceRub,
        email: email.trim() || undefined,
        page: "app/booking/parking",
      });
      setCreatedBookingId(r.booking.id);
      setCreatedPrice(r.booking.priceRub);
      setCreatedName(carNumber.trim().toUpperCase() || "клиент");
      setSuccessOpen(true);
    },
    onError: (e: Error) => setError(e.message),
  });

  const canProceed = useMemo(() => {
    if (step === 0) return dateTo.getTime() > dateFrom.getTime();
    if (step === 1) return carNumber.trim().length >= 3;
    return true;
  }, [step, dateFrom, dateTo, carNumber]);

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : router.back()}>
          <Text style={s.back}>← {step === 0 ? "На главную" : STEPS[step - 1]}</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Парковка · {AIRPORT_NAME}</Text>
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
        {/* STEP 0 — Даты */}
        {step === 0 && (
          <>
            <View style={s.airportBadge}>
              <Text style={s.airportBadgeIco}>✈</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.airportBadgeTitle}>Парковка Шереметьево</Text>
                <Text style={s.airportBadgeLede}>5 минут до терминалов B / C / D · трансфер 24/7</Text>
              </View>
              <TouchableOpacity style={s.mapBtn} onPress={() => setMapOpen(true)} activeOpacity={0.7}>
                <Text style={s.mapBtnTxt}>📍 Схема</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.title}>Когда едете?</Text>
            <Text style={s.lede}>Дата заезда — за 3 часа до вылета. Выезд — после возвращения.</Text>

            <View style={{ marginBottom: spacing.md }}>
              <DatePickerField
                label="Заезд"
                value={dateFrom}
                minimumDate={new Date()}
                onChange={(d) => {
                  setDateFrom(d);
                  if (dateTo.getTime() <= d.getTime()) {
                    const next = new Date(d);
                    next.setDate(next.getDate() + 1);
                    setDateTo(next);
                  }
                }}
              />
            </View>
            <DatePickerField
              label="Выезд"
              value={dateTo}
              minimumDate={dateFrom}
              onChange={setDateTo}
            />

            <View style={s.daysBox}>
              <Text style={s.daysLabel}>Дней:</Text>
              <Text style={s.daysValue}>{calc?.days ?? "—"}</Text>
            </View>

            <View style={s.pricePreview}>
              <Text style={s.pricePreviewLabel}>Стоимость:</Text>
              <Text style={s.pricePreviewValue}>
                {calc?.totalRub ? `${calc.totalRub.toLocaleString("ru")} ₽` : "—"}
              </Text>
            </View>
          </>
        )}

        {/* STEP 1 — Авто */}
        {step === 1 && (
          <>
            <Text style={s.title}>Что за машина?</Text>
            <Text style={s.lede}>Гос.номер нужен для договора хранения, модель — для удобства встречающего</Text>

            <Text style={s.label}>Гос. номер *</Text>
            <TextInput
              style={s.input}
              value={carNumber}
              onChangeText={setCarNumber}
              placeholder="А123БВ77"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              maxLength={15}
            />

            <Text style={s.label}>Модель (необязательно)</Text>
            <TextInput
              style={s.input}
              value={carModel}
              onChangeText={setCarModel}
              placeholder="Toyota Camry"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={s.label}>Email для подтверждения (необязательно)</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            {availablePoints > 0 && (
              <TouchableOpacity
                style={[s.toggle, usePoints && s.toggleActive]}
                onPress={() => setUsePoints(!usePoints)}
              >
                <View style={s.toggleDot}>
                  {usePoints && <View style={s.toggleDotInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleTitle}>Использовать баллы</Text>
                  <Text style={s.toggleHint}>Доступно: {availablePoints.toLocaleString("ru")} ₽</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* STEP 2 — Готово */}
        {step === 2 && (
          <>
            <Text style={s.title}>Проверьте детали</Text>
            <Text style={s.lede}>Если всё верно — подтвердите бронирование</Text>

            <View style={s.summary}>
              <SummaryRow k="Аэропорт" v={AIRPORT_NAME} />
              <SummaryRow k="Заезд" v={dateFrom.toLocaleDateString("ru", { day: "numeric", month: "long" }) + " 10:00"} />
              <SummaryRow k="Выезд" v={dateTo.toLocaleDateString("ru", { day: "numeric", month: "long" }) + " 10:00"} />
              <SummaryRow k="Дней" v={String(calc?.days ?? "—")} />
              <SummaryRow k="Машина" v={carNumber.toUpperCase() + (carModel ? ` · ${carModel}` : "")} />
              {calc?.discountRub ? <SummaryRow k="Промокод" v={`−${calc.discountRub} ₽`} /> : null}
              {calc?.loyaltyDiscountRub ? <SummaryRow k="Баллы" v={`−${calc.loyaltyDiscountRub} ₽`} /> : null}
              <View style={s.divider} />
              <View style={[s.summaryRow, { paddingVertical: spacing.md }]}>
                <Text style={s.totalLabel}>Итого</Text>
                <Text style={s.totalValue}>{calc?.finalRub.toLocaleString("ru")} ₽</Text>
              </View>
              {calc && calc.pointsToEarn > 0 && (
                <Text style={s.bonus}>Будет начислено +{calc.pointsToEarn} баллов</Text>
              )}
            </View>

            {error && <Text style={s.error}>{error}</Text>}
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        {step < 2 ? (
          <TouchableOpacity
            style={[s.cta, !canProceed && s.ctaDisabled]}
            onPress={() => canProceed && setStep(step + 1)}
            disabled={!canProceed}
          >
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
              : <Text style={s.ctaTxt}>Забронировать за {calc?.finalRub.toLocaleString("ru")} ₽</Text>}
          </TouchableOpacity>
        )}
      </View>

      <BookingSuccessModal
        visible={successOpen}
        name={createdName}
        dateFrom={dateFrom}
        priceRub={createdPrice}
        bookingId={createdBookingId}
        service="parking"
        onClose={() => {
          setSuccessOpen(false);
          router.replace(`/booking/${createdBookingId}`);
        }}
        onShowMap={() => setMapOpen(true)}
      />

      <RouteMapModal visible={mapOpen} onClose={() => setMapOpen(false)} />
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

  airportBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.divider,
    marginBottom: spacing.xl,
  },
  airportBadgeIco: { fontSize: 28, marginRight: spacing.md, color: colors.primary },
  airportBadgeTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "600" },
  airportBadgeLede: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  mapBtn: { backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.md, marginLeft: spacing.sm },
  mapBtnTxt: { color: colors.textOnDark, fontSize: 12, fontWeight: "700" },

  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "300", fontFamily: fonts.heading, marginBottom: spacing.sm },
  lede: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  label: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700", textTransform: "uppercase", marginTop: spacing.md, marginBottom: spacing.sm },

  input: { backgroundColor: colors.surfaceMuted, color: colors.textPrimary, padding: spacing.md, borderRadius: radii.md, fontSize: 16, borderWidth: 1, borderColor: colors.border },

  daysBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceMuted, padding: spacing.lg, borderRadius: radii.md, marginTop: spacing.lg },
  daysLabel: { color: colors.textSecondary, fontSize: 14 },
  daysValue: { color: colors.primary, fontSize: 24, fontWeight: "700" },

  pricePreview: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, marginTop: spacing.sm, backgroundColor: "rgba(63,184,175,0.1)", borderRadius: radii.md, borderWidth: 1, borderColor: colors.primary },
  pricePreviewLabel: { color: colors.textSecondary, fontSize: 14 },
  pricePreviewValue: { color: colors.primary, fontSize: 22, fontWeight: "700" },

  toggle: { marginTop: spacing.lg, backgroundColor: colors.surfaceMuted, padding: spacing.md, borderRadius: radii.md, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border },
  toggleActive: { backgroundColor: "rgba(63,184,175,0.08)", borderColor: colors.primary },
  toggleDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary, justifyContent: "center", alignItems: "center", marginRight: spacing.md },
  toggleDotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  toggleTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  toggleHint: { color: colors.primary, fontSize: 11, marginTop: 2 },

  summary: { backgroundColor: colors.surfaceMuted, padding: spacing.lg, borderRadius: radii.md },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryK: { color: colors.textSecondary, fontSize: 13 },
  summaryV: { color: colors.textPrimary, fontSize: 13, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  totalLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  totalValue: { color: colors.primary, fontSize: 26, fontWeight: "700", fontFamily: fonts.heading },
  bonus: { color: colors.success, fontSize: 12, textAlign: "right", marginTop: spacing.sm },

  error: { color: colors.danger, backgroundColor: colors.dangerBg, padding: spacing.md, borderRadius: radii.sm, marginTop: spacing.md, fontSize: 13 },

  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface },
  cta: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radii.md, alignItems: "center", minHeight: 52, justifyContent: "center" },
  ctaDisabled: { opacity: 0.5 },
  ctaTxt: { color: colors.textOnDark, fontSize: 15, fontWeight: "700" },
});
