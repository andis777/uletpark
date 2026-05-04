import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { requestOtp, verifyOtp, setTokens } from "@/lib/api";
import { analytics } from "@/lib/analytics";

export default function Login() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { analytics.screenView("login"); analytics.authStarted(); }, []);

  async function onRequest() {
    setBusy(true);
    try {
      const r = await requestOtp({ phone });
      if (r.devCode) Alert.alert("DEV", `Код для теста: ${r.devCode}`);
      setStep("code");
    } catch (e) { Alert.alert("Ошибка", String(e)); }
    finally { setBusy(false); }
  }

  async function onVerify() {
    setBusy(true);
    try {
      const r = await verifyOtp({ phone, code });
      await setTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
      analytics.authCompleted();
      router.replace("/(tabs)");
    } catch (e) { Alert.alert("Ошибка", String(e)); }
    finally { setBusy(false); }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.brand}>Улётная парковка</Text>
      <Text style={s.title}>{step === "phone" ? "Войти по номеру телефона" : "Введите код из SMS"}</Text>

      {step === "phone" ? (
        <>
          <TextInput
            style={s.input}
            placeholder="+7 999 123 45 67"
            placeholderTextColor="#8a8580"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
          <TouchableOpacity style={s.btn} onPress={onRequest} disabled={busy || phone.length < 10}>
            <Text style={s.btnTxt}>{busy ? "..." : "Получить код"}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={s.input}
            placeholder="000000"
            placeholderTextColor="#8a8580"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            autoFocus
          />
          <TouchableOpacity style={s.btn} onPress={onVerify} disabled={busy || code.length !== 6}>
            <Text style={s.btnTxt}>{busy ? "..." : "Войти"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep("phone")}>
            <Text style={s.alt}>Изменить номер</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#1F2430", padding: 24, justifyContent: "center" },
  brand: { color: "#3FB8AF", fontSize: 14, letterSpacing: 4, textTransform: "uppercase", marginBottom: 32 },
  title: { color: "#fff", fontSize: 28, fontWeight: "300", marginBottom: 32 },
  input: { backgroundColor: "#2D3039", color: "#fff", padding: 16, borderRadius: 12, fontSize: 18, marginBottom: 16 },
  btn: { backgroundColor: "#FF6B4A", padding: 16, borderRadius: 12, alignItems: "center" },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "600" },
  alt: { color: "#8a8580", textAlign: "center", marginTop: 16 },
});
