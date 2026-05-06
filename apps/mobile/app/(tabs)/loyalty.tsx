import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollView, Text, View, StyleSheet, ActivityIndicator, TextInput, Alert, TouchableOpacity, Share } from "react-native";
import { getLoyalty, applyReferral } from "@/lib/api";
import { colors, fonts, radii, spacing } from "@/lib/theme";

export default function Loyalty() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["loyalty"], queryFn: getLoyalty });
  const [refCode, setRefCode] = useState("");
  const [showInput, setShowInput] = useState(false);

  const applyRef = useMutation({
    mutationFn: () => applyReferral(refCode.trim()),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["loyalty"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      Alert.alert("Бонус начислен", `+${r.bonusRub} ₽ на счёт`);
      setRefCode(""); setShowInput(false);
    },
    onError: (e: Error) => {
      const msg = e.message === "CODE_NOT_FOUND" ? "Код не найден"
        : e.message === "ALREADY_USED" ? "Ты уже применял реферальный код"
        : e.message === "SELF_REFERRAL" ? "Это твой собственный код"
        : e.message;
      Alert.alert("Не получилось", msg);
    },
  });

  if (isLoading || !data) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  async function shareCode() {
    if (!data?.referralCode) return;
    try {
      await Share.share({
        message: `Бронируй парковку у Шереметьево / Домодедово / Внуково в Улётной парковке по моему промокоду ${data.referralCode} — получишь ${data.referralBonusRub} ₽ на счёт лояльности. https://uletnayaparkovka.ru`,
      });
    } catch {}
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.brand}>Карта лояльности</Text>
      </View>

      <View style={s.body}>
        {/* Главная карточка тира */}
        <View style={s.loyCard}>
          <Text style={s.loyTier}>{data.tier.toUpperCase()}</Text>
          <Text style={s.loyPoints}>{data.points.toLocaleString("ru")}</Text>
          <Text style={s.loyLabel}>баллов · 1 балл = 1 ₽</Text>

          {data.nextTier && (
            <View style={s.progBox}>
              <View style={s.progBg}>
                <View style={[s.progFill, { width: `${data.progress * 100}%` }]} />
              </View>
              <Text style={s.progTxt}>
                До тира {data.nextTier.toUpperCase()}: ещё {data.remainingToNextTierRub.toLocaleString("ru")} ₽
              </Text>
            </View>
          )}
        </View>

        {/* Реферал */}
        {data.referralCode && (
          <View style={s.refer}>
            <Text style={s.referLabel}>ПРИГЛАСИ ДРУГА</Text>
            <Text style={s.referCode}>{data.referralCode}</Text>
            <Text style={s.referHint}>
              Друг получит {data.referralBonusRub} ₽ бонус{"\n"}
              Ты — {data.referralBonusRub} ₽ при первой брони друга
            </Text>
            <TouchableOpacity style={s.shareBtn} onPress={shareCode}>
              <Text style={s.shareTxt}>Поделиться</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Apply referral */}
        {!showInput ? (
          <TouchableOpacity onPress={() => setShowInput(true)} style={{ padding: spacing.lg, alignItems: "center" }}>
            <Text style={s.applyTrigger}>+ У меня есть реферальный код</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.applyBox}>
            <Text style={s.applyLabel}>Введи код друга</Text>
            <TextInput
              style={s.input}
              value={refCode}
              onChangeText={(t) => setRefCode(t.toUpperCase())}
              placeholder="UPABC123"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[s.cta, refCode.length < 4 && { opacity: 0.5 }]}
              disabled={refCode.length < 4 || applyRef.isPending}
              onPress={() => applyRef.mutate()}
            >
              <Text style={s.ctaTxt}>{applyRef.isPending ? "..." : `Получить +${data.referralBonusRub} ₽`}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* История */}
        {data.transactions.length > 0 && (
          <>
            <Text style={s.histTitle}>ИСТОРИЯ</Text>
            {data.transactions.map(t => (
              <View key={t.id} style={s.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.txReason}>{labelReason(t.reason)}</Text>
                  <Text style={s.txDate}>{new Date(t.createdAt).toLocaleDateString("ru")}</Text>
                </View>
                <Text style={[s.txDelta, { color: t.delta > 0 ? colors.success : colors.danger }]}>
                  {t.delta > 0 ? "+" : ""}{t.delta}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function labelReason(r: string) {
  return ({
    booking_completed: "Завершённая бронь",
    redeem: "Оплата баллами",
    referral_bonus_invited: "Бонус за регистрацию",
    referral_bonus_referrer: "Бонус за приглашение",
    manual_adjust: "Корректировка",
  } as Record<string, string>)[r] ?? r;
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 100 },

  header: { backgroundColor: colors.graphite, paddingHorizontal: spacing.xl, paddingTop: 48, paddingBottom: spacing.lg },
  brand: { color: colors.textOnDark, fontSize: 22, fontWeight: "300", fontFamily: fonts.heading },

  body: { padding: spacing.xl },

  loyCard: {
    backgroundColor: colors.primary,
    padding: spacing.xxl,
    borderRadius: radii.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  loyTier: { color: colors.graphite, fontSize: 11, letterSpacing: 4, fontWeight: "800", marginBottom: spacing.md },
  loyPoints: { color: colors.textOnDark, fontSize: 56, fontWeight: "200", fontFamily: fonts.heading },
  loyLabel: { color: colors.textOnDark, opacity: 0.8, fontSize: 11, marginTop: 4 },
  progBox: { width: "100%", marginTop: spacing.lg },
  progBg: { height: 4, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 2, overflow: "hidden" },
  progFill: { height: 4, backgroundColor: colors.graphite },
  progTxt: { color: colors.textOnDark, opacity: 0.85, fontSize: 11, marginTop: 8, textAlign: "center" },

  refer: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  referLabel: { color: colors.textSecondary, fontSize: 10, letterSpacing: 2, fontWeight: "700", marginBottom: spacing.sm },
  referCode: { color: colors.primary, fontSize: 26, fontWeight: "700", letterSpacing: 4, fontFamily: fonts.heading },
  referHint: { color: colors.textSecondary, fontSize: 12, textAlign: "center", marginTop: spacing.md, lineHeight: 18 },
  shareBtn: { marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: radii.pill },
  shareTxt: { color: colors.textOnDark, fontWeight: "700", fontSize: 13 },

  applyTrigger: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  applyBox: { backgroundColor: colors.surfaceMuted, padding: spacing.lg, borderRadius: radii.md, marginBottom: spacing.lg },
  applyLabel: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "600", textTransform: "uppercase", marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, borderRadius: radii.md, fontSize: 16, letterSpacing: 2, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  cta: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radii.md, alignItems: "center" },
  ctaTxt: { color: colors.textOnDark, fontSize: 14, fontWeight: "700" },

  histTitle: { color: colors.textSecondary, fontSize: 11, letterSpacing: 2, fontWeight: "700", marginTop: spacing.xl, marginBottom: spacing.sm },
  txRow: { flexDirection: "row", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, alignItems: "center" },
  txReason: { color: colors.textPrimary, fontSize: 13 },
  txDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  txDelta: { fontSize: 16, fontWeight: "700" },
});
