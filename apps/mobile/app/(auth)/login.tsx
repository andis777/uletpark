import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { router } from "expo-router";
import { requestCode, verifyCode, setTokens } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { colors, fonts, radii, spacing } from "@/lib/theme";

const PRIVACY_URL = "https://uletnayaparkovka.ru/politika-konfidencialnosti";
const OFFER_URL = "https://uletnayaparkovka.ru/politika-konfidencialnosti#oferta";
const RULES_URL = "https://uletnayaparkovka.ru/politika-konfidencialnosti#rules";

export default function Login() {
  const [step, setStep] = useState<"contact" | "code">("contact");
  // Почта — основной канал: письма бесплатны и доходят, в отличие от SMS.
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    analytics.screenView("login");
    analytics.authStarted();
  }, []);

  /** Что отправляем на сервер — почту или телефон. */
  function target() {
    return mode === "email" ? { email: email.trim() } : { phone };
  }

  async function onRequest() {
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const r = await requestCode(target());
      setInfo(
        r.devCode
          ? `Тестовый код: ${r.devCode}`
          : mode === "email"
            ? `Код отправлен на ${email.trim()}. Проверьте почту, в том числе «Спам».`
            : `Код отправлен по SMS на ${phone}`
      );
      setStep("code");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[login] request error", e);
      setErr(
        msg.includes("EMAIL_SEND_FAILED")
          ? "Не удалось отправить письмо. Попробуйте войти по телефону."
          : msg.includes("TOO_MANY_REQUESTS")
            ? "Слишком много попыток. Попробуйте через несколько минут."
            : `Не удалось отправить код: ${msg}`
      );
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setErr(null);
    setBusy(true);
    try {
      const r = await verifyCode({ ...target(), code });
      await setTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      router.replace("/(tabs)");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        msg.includes("INVALID_CODE")
          ? "Неверный код. Проверьте и введите ещё раз."
          : msg.includes("CODE_NOT_FOUND_OR_EXPIRED")
            ? "Срок действия кода истёк. Запросите новый."
            : `Не удалось войти: ${msg}`
      );
    } finally {
      setBusy(false);
    }
  }

  // Минимально: 11 цифр для российского номера или 10 без 7
  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const emailOk = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email.trim());
  const contactOk = mode === "email" ? emailOk : phoneOk;
  const codeOk = code.length === 6;
  const contactLabel = mode === "email" ? email.trim() : phone;

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
        <Text style={s.eyebrow}>{step === "contact" ? "ВХОД И РЕГИСТРАЦИЯ" : "ПОДТВЕРЖДЕНИЕ"}</Text>
        <Text style={s.title}>
          {step === "contact"
            ? mode === "email" ? "Введите вашу почту" : "Введите номер телефона"
            : "Введите код"}
        </Text>
        <Text style={s.lede}>
          {step === "contact"
            ? mode === "email"
              ? "Пришлём код на почту — быстро и бесплатно"
              : "Отправим SMS с кодом подтверждения"
            : `Код отправлен на ${contactLabel}. Действует 15 минут.`}
        </Text>

        {step === "contact" ? (
          <>
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, mode === "email" && s.tabActive]}
                onPress={() => { setMode("email"); setErr(null); setInfo(null); }}
                activeOpacity={0.8}
              >
                <Text style={[s.tabTxt, mode === "email" && s.tabTxtActive]}>Почта</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, mode === "phone" && s.tabActive]}
                onPress={() => { setMode("phone"); setErr(null); setInfo(null); }}
                activeOpacity={0.8}
              >
                <Text style={[s.tabTxt, mode === "phone" && s.tabTxtActive]}>Телефон</Text>
              </TouchableOpacity>
            </View>

            {mode === "email" ? (
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                autoFocus
                onSubmitEditing={() => contactOk && !busy && onRequest()}
              />
            ) : (
              <TextInput
                style={s.input}
                placeholder="+7 999 123 45 67"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
                onSubmitEditing={() => contactOk && !busy && onRequest()}
              />
            )}
            {err && <Text style={s.err}>{err}</Text>}
            {info && <Text style={s.info}>{info}</Text>}
            <TouchableOpacity
              style={[s.btn, (busy || !contactOk) && s.btnDisabled]}
              onPress={onRequest}
              disabled={busy || !contactOk}
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
            <TouchableOpacity onPress={() => { setStep("contact"); setCode(""); setErr(null); setInfo(null); }}>
              <Text style={s.alt}>{mode === "email" ? "Изменить почту" : "Изменить номер"}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={s.legalBlock}>
          <Text style={s.legal}>
            Нажимая «{step === "contact" ? "Получить код" : "Войти"}», вы соглашаетесь с условиями использования сервиса.
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

  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radii.sm, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabTxt: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  tabTxtActive: { color: colors.textOnDark },

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
