import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ScrollView, Text, View, StyleSheet, ActivityIndicator,
  TextInput, Alert, TouchableOpacity, Share,
} from "react-native";
import { getLoyalty, applyReferral } from "@/lib/api";
import { Button } from "@/components/Button";

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
      Alert.alert("Бонус начислен", `+${r.bonusRub} ₽ на счёт лояльности`);
      setRefCode("");
      setShowInput(false);
    },
    onError: (e: Error) => {
      const msg = e.message === "CODE_NOT_FOUND" ? "Код не найден" :
                  e.message === "ALREADY_USED"   ? "Ты уже применял реферальный код" :
                  e.message === "SELF_REFERRAL"  ? "Это твой собственный код" :
                  e.message;
      Alert.alert("Не получилось", msg);
    },
  });

  if (isLoading || !data) {
    return <ActivityIndicator color="#3FB8AF" style={{ flex: 1, backgroundColor: "#1F2430" }} />;
  }

  async function shareCode() {
    if (!data?.referralCode) return;
    try {
      await Share.share({
        message: `Бронируй парковку у Шереметьево/Домодедово/Внуково в Улётной парковке по моему промокоду ${data.referralCode} — получишь ${data.referralBonusRub} ₽ на счёт лояльности. https://uletnayaparkovka.ru`,
      });
    } catch { /* user cancelled */ }
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 100 }}>
      <View style={s.loyCard}>
        <Text style={s.tier}>{data.tier.toUpperCase()}</Text>
        <Text style={s.points}>{data.points.toLocaleString("ru")}</Text>
        <Text style={s.label}>баллов · 1 балл = 1 ₽</Text>
        {data.nextTier && (
          <View style={s.progBox}>
            <View style={s.progBg}>
              <View style={[s.progFill, { width: `${data.progress * 100}%` }]} />
            </View>
            <Text style={s.progTxt}>
              До тира {data.nextTier.toUpperCase()}: ещё {data.remainingToNextTierRub.toLocaleString("ru")} ₽ покупок
            </Text>
          </View>
        )}
      </View>

      {data.referralCode && (
        <View style={s.refer}>
          <Text style={s.referLabel}>Пригласи друга</Text>
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

      {!showInput ? (
        <TouchableOpacity onPress={() => setShowInput(true)} style={{ marginTop: 16, padding: 16 }}>
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
            placeholderTextColor="#5a5d65"
            autoCapitalize="characters"
          />
          <Button
            label={`Получить +${data.referralBonusRub} ₽`}
            onPress={() => applyRef.mutate()}
            loading={applyRef.isPending}
            disabled={refCode.length < 4}
          />
        </View>
      )}

      {data.transactions.length > 0 && (
        <View style={{ marginTop: 32 }}>
          <Text style={s.sectionTitle}>История</Text>
          {data.transactions.map(t => (
            <View key={t.id} style={s.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.txReason}>{labelReason(t.reason)}</Text>
                <Text style={s.txDate}>{new Date(t.createdAt).toLocaleDateString("ru")}</Text>
              </View>
              <Text style={[s.txDelta, { color: t.delta > 0 ? "#3FB8AF" : "#FF6B4A" }]}>
                {t.delta > 0 ? "+" : ""}{t.delta}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  wrap: { flex: 1, backgroundColor: "#1F2430" },
  loyCard: { backgroundColor: "#2D3039", padding: 32, borderRadius: 16, alignItems: "center", marginBottom: 16 },
  tier: { color: "#3FB8AF", fontSize: 12, letterSpacing: 4, marginBottom: 16 },
  points: { color: "#fff", fontSize: 64, fontWeight: "200" },
  label: { color: "#8a8580", marginBottom: 24, fontSize: 11 },
  progBox: { width: "100%", marginTop: 16 },
  progBg: { height: 6, backgroundColor: "#1F2430", borderRadius: 3, overflow: "hidden" },
  progFill: { height: 6, backgroundColor: "#FF6B4A" },
  progTxt: { color: "#8a8580", fontSize: 11, marginTop: 8, textAlign: "center" },
  refer: { backgroundColor: "#2D3039", padding: 24, borderRadius: 16, alignItems: "center" },
  referLabel: { color: "#8a8580", fontSize: 9, letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" },
  referCode: { color: "#3FB8AF", fontSize: 28, fontWeight: "300", letterSpacing: 4 },
  referHint: { color: "#8a8580", fontSize: 11, textAlign: "center", marginTop: 12, lineHeight: 18 },
  shareBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: "#3FB8AF", borderRadius: 100 },
  shareTxt: { color: "#1F2430", fontWeight: "600", fontSize: 13 },
  applyTrigger: { color: "#3FB8AF", fontSize: 13, textAlign: "center" },
  applyBox: { backgroundColor: "#2D3039", padding: 18, borderRadius: 14, marginTop: 16 },
  applyLabel: { color: "#8a8580", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  input: { backgroundColor: "#1F2430", color: "#fff", padding: 12, borderRadius: 10, fontSize: 16, letterSpacing: 2, marginBottom: 12 },
  sectionTitle: { color: "#8a8580", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 },
  txRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#2D3039", alignItems: "center" },
  txReason: { color: "#fff", fontSize: 13 },
  txDate: { color: "#5a5d65", fontSize: 11, marginTop: 2 },
  txDelta: { fontSize: 16, fontWeight: "500" },
});
