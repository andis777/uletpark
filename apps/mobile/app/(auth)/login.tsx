import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { router } from "expo-router";
import { requestOtp, verifyOtp, setTokens } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { colors, fonts, radii, spacing } from "@/lib/theme";

const PRIVACY_URL = "https://uletnayaparkovka.ru/politika-konfidencialnosti";
const OFFER_URL = "https://uletnayaparkovka.ru/politika-konfidencialnosti#oferta";
const RULES_URL = "https://uletnayaparkovka.ru/politika-konfidencialnosti#rules";

export default function Login() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    analytics.screenView("login");
    analytics.authStarted();
  }, []);

  async function onRequest() {
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      console.log("[login] requestOtp", phone);
      const r = await requestOtp({ phone });
      console.log("[login] response", r);
      setInfo(r.devCode ? `Тестовый код: ${r.devCode}` : "Код отправлен. В STUB-режиме код: 111111");
      setStep("code");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[login] error", e);
      setErr(`Не удалось отправить: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setErr(null);
    setBusy(true);
    try {
      const r = await verifyOtp({ phone, code });
      await setTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      router.replace("/(tabs)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(`Не удалось войти: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  // Минимально: 11 цифр для российского номера или 10 без 7
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const codeOk = code.length === 6;

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.brand}>
          <Text style={{ color: "#3FB8AF" }}>✈ Улётная </Text>
          <Text style={{ color: "#ff6b8a" }}>Пит-стоп</Text>
          <Text style={{ color: "#3FB8AF" }}> парковка</Text>
        </Text>
      </View>

      <View style={s.body}>
        <Text style={s.eyebrow}>{step === "phone" ? "ВХОД ПО ТЕЛЕФОНУ" : "ПОДТВЕРЖДЕНИЕ"}</Text>
        <Text style={s.title}>
          {step === "phone" ? "Введите номер телефона" : "Введите код из SMS"}
        </Text>
        <Text style={s.lede}>
          {step === "phone"
            ? "Отправим SMS с кодом подтверждения"
            : `Код отправлен на ${phone}. Действует 5 минут.`}
        </Text>

        {step === "phone" ? (
          <>
            <TextInput
              style={s.input}
              placeholder="+7 999 123 45 67"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoFocus
              onSubmitEditing={() => !busy && onRequest()}
            />
            <Text style={s.debug}>Цифр введено: {phone.replace(/\D/g, "").length} (нужно ≥10)</Text>
            {err && <Text style={s.err}>{err}</Text>}
            {info && <Text style={s.info}>{info}</Text>}
            <TouchableOpacity
              style={[s.btn, busy && s.btnDisabled]}
              onPress={onRequest}
              disabled={busy}
              activeOpacity={0.7}
            >
              {busy ? <ActivityIndicator color={colors.textOnDark} /> : <Text style={s.btnTxt}>Получить код</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={[s.input, s.inputCode]}
              placeholder="111111"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              autoFocus
              onSubmitEditing={() => codeOk && !busy && onVerify()}
            />
            {info && <Text style={s.info}>{info}</Text>}
            {err && <Text style={s.err}>{err}</Text>}
            <TouchableOpacity
              style={[s.btn, (busy || !codeOk) && s.btnDisabled]}
              onPress={onVerify}
              disabled={busy || !codeOk}
            >
              {busy ? <ActivityIndicator color={colors.textOnDark} /> : <Text style={s.btnTxt}>Войти</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep("phone"); setCode(""); setErr(null); }}>
              <Text style={s.alt}>Изменить номер</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={s.legalBlock}>
          <Text style={s.legal}>
            Нажимая «{step === "phone" ? "Получить код" : "Войти"}», вы соглашаетесь с условиями использования сервиса.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(OFFER_URL)}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={s.legalLink}>Пользовательское соглашение (оферта)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_URL)}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={s.legalLink}>Политика обработки персональных данных</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(RULES_URL)}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={s.legalLink}>Правила пользования сервисом</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: {
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.lg,
  },
  brand: { color: colors.textOnDark, fontSize: 18, fontWeight: "600", fontFamily: fonts.heading },

  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl },
  eyebrow: { color: colors.primary, fontSize: 11, letterSpacing: 3, fontWeight: "600", marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "300", fontFamily: fonts.heading, marginBottom: spacing.sm, lineHeight: 34 },
  lede: { color: colors.textSecondary, fontSize: 14, marginBottom: spacing.xxl, lineHeight: 22 },

  input: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textPrimary,
    padding: spacing.lg,
    borderRadius: radii.md,
    fontSize: 18,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputCode: { letterSpacing: 8, textAlign: "center", fontSize: 24, fontWeight: "600" },

  err: {
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    fontSize: 13,
    lineHeight: 18,
  },
  info: {
    color: colors.success,
    backgroundColor: colors.successBg,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    fontSize: 13,
    fontWeight: "600",
  },

  btn: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radii.md, alignItems: "center", marginBottom: spacing.md, minHeight: 52, justifyContent: "center" },
  btnDisabled: { backgroundColor: colors.textMuted, opacity: 0.5 },
  btnTxt: { color: colors.textOnDark, fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },

  alt: { color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm, fontSize: 13 },
  legalBlock: { marginTop: "auto", paddingBottom: spacing.xl, alignItems: "center" },
  legal: { color: colors.textMuted, fontSize: 12, textAlign: "center", lineHeight: 17, marginBottom: spacing.sm },
  legalLink: { color: colors.primary, fontSize: 12, textAlign: "center", textDecorationLine: "underline", paddingVertical: 4, lineHeight: 18 },
  debug: { color: colors.textMuted, fontSize: 11, marginBottom: spacing.sm, fontFamily: "monospace" },
});
