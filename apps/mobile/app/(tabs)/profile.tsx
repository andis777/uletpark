import { useState, useEffect } from "react";
import { ScrollView, Text, View, StyleSheet, TextInput, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clearTokens, getMe, updateMe } from "@/lib/api";
import { colors, fonts, radii, spacing } from "@/lib/theme";

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
    return <ActivityIndicator color={colors.primary} style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.brand}>Профиль</Text>
      </View>

      <View style={s.body}>
        <View style={s.phoneCard}>
          <Text style={s.label}>Телефон</Text>
          <Text style={s.phone}>{data.user.phone}</Text>
        </View>

        <Text style={s.label}>Имя</Text>
        <TextInput style={s.input} value={first} onChangeText={setFirst} placeholder="Имя" placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>Фамилия</Text>
        <TextInput style={s.input} value={last} onChangeText={setLast} placeholder="Фамилия" placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>Email</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity style={s.cta} onPress={() => save.mutate()} disabled={save.isPending}>
          <Text style={s.ctaTxt}>{save.isPending ? "..." : "Сохранить"}</Text>
        </TouchableOpacity>

        <View style={s.tierCard}>
          <Text style={s.tierLabel}>Тариф лояльности</Text>
          <Text style={s.tier}>{data.user.loyaltyTier.toUpperCase()}</Text>
          <Text style={s.points}>{data.user.loyaltyPoints} баллов</Text>
        </View>

        <TouchableOpacity style={s.logout} onPress={logout}>
          <Text style={s.logoutTxt}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 100 },

  header: {
    backgroundColor: colors.graphite,
    paddingHorizontal: spacing.xl,
    paddingTop: 48,
    paddingBottom: spacing.lg,
  },
  brand: { color: colors.textOnDark, fontSize: 22, fontWeight: "300", fontFamily: fonts.heading },

  body: { padding: spacing.xl },

  phoneCard: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.xl,
  },
  phone: { color: colors.textPrimary, fontSize: 18, fontWeight: "600", marginTop: 4 },

  label: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "600", textTransform: "uppercase", marginBottom: spacing.sm, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    padding: spacing.md,
    borderRadius: radii.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cta: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radii.md, alignItems: "center", marginTop: spacing.lg },
  ctaTxt: { color: colors.textOnDark, fontSize: 14, fontWeight: "700" },

  tierCard: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xl,
    borderRadius: radii.lg,
    alignItems: "center",
    marginTop: spacing.xxl,
  },
  tierLabel: { color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "600", textTransform: "uppercase" },
  tier: { color: colors.primary, fontSize: 22, fontWeight: "700", letterSpacing: 4, marginTop: spacing.sm },
  points: { color: colors.textPrimary, fontSize: 14, marginTop: 4 },

  logout: { padding: spacing.lg, alignItems: "center", marginTop: spacing.xl },
  logoutTxt: { color: colors.danger, fontSize: 13 },
});
