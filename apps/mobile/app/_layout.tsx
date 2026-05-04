import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, View } from "react-native";
import { isAuthed } from "@/lib/api";
import { registerForPushNotificationsAsync } from "@/lib/push";
import { initAnalytics } from "@/lib/analytics";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await isAuthed();
      setAuthed(ok);
      setReady(true);
      initAnalytics();
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!authed && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (authed && inAuthGroup) {
      router.replace("/(tabs)");
      // Зарегистрируем push-токен после успешного логина
      registerForPushNotificationsAsync().catch(() => {});
    }
  }, [ready, authed, segments]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1F2430", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#3FB8AF" size="large" />
      </View>
    );
  }
  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#1F2430" } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="booking/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="booking/[id]" />
      </Stack>
    </QueryClientProvider>
  );
}
