import { useState, useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, TextInput, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clearTokens, getMe, updateMe } from "@/lib/api";
import { Button } from "@/components/Button";

export default function Profile() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (data?.user) {
      setFirst(data.user.firstName ?? "");
      setLast(data.user.lastName ?? "");
      setEmail(data.user.email ?? "");
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateMe({ firstName: first || undefined, lastName: last || undefined, email: email || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      Alert.alert("Сохранено");
    },
    onError: (e: Error) => Alert.alert("Не удалось сохранить", e.message),
  });

  async function logout() {
    Alert.alert("Выйти?", "", [
      { text: "Отмена" },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => { await clearTokens(); router.replace("/(auth)/login"); },
      },
    ]);
  }

  if (isLoading || !data) {
    return <ActivityIndicator color="#3FB8AF" style={{ flex: 1, backgroundColor: "#1F2430" }} />;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={s.h1}>Профиль</Text>

      <View style={s.phoneCard}>
        <Text style={s.phoneLabel}>Телефон</Text>
        <Text style={s.phoneValue}>{data.user.phone}</Text>
      </View>

      <Text style={s.label}>Имя</Text>
      <TextInput style={s.input} value={first} onChangeText={setFirst} placeholder="Имя" placeholderTextColor="#5a5d65" />

      <Text style={s.label}>Фамилия</Text>
      <TextInput style={s.input} value={last} onChangeText={setLast} placeholder="Фамилия" placeholderTextColor="#5a5d65" />

      <Text style={s.label}>Email</Text>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor="#5a5d65"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button label="Сохранить" onPress={() => save.mutate()} loading={save.isPending} style={{ marginTop: 16 }} />

      <View style={s.section}>
        <Text style={s.sectionLabel}>Тариф лояльности</Text>
        <Text style={s.tier}>{data.user.loyaltyTier.toUpperCase()}</Text>
        <Text style={s.points}>{data.user.loyaltyPoints} баллов</Text>
      </View>

      <TouchableOpacity style={s.logout} onPress={logout}>
        <Text style={s.logoutTxt}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#1F2430" },
  h1: { color: "#fff", fontSize: 28, fontWeight: "300", marginBottom: 24 },
  phoneCard: { backgroundColor: "#2D3039", padding: 16, borderRadius: 12, marginBottom: 24 },
  phoneLabel: { color: "#8a8580", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  phoneValue: { color: "#fff", fontSize: 18, marginTop: 4, fontWeight: "500" },
  label: { color: "#8a8580", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: 16, marginBottom: 8 },
  input: { backgroundColor: "#2D3039", color: "#fff", padding: 14, borderRadius: 10, fontSize: 16 },
  section: { backgroundColor: "#2D3039", padding: 18, borderRadius: 14, marginTop: 32, alignItems: "center" },
  sectionLabel: { color: "#8a8580", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  tier: { color: "#3FB8AF", fontSize: 22, fontWeight: "600", letterSpacing: 4, marginTop: 8 },
  points: { color: "#fff", fontSize: 14, marginTop: 4 },
  logout: { padding: 16, alignItems: "center", marginTop: 32, marginBottom: 16 },
  logoutTxt: { color: "#FF6B4A", fontSize: 14 },
});
