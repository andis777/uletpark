import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, View } from "react-native";
import { isAuthed } from "@/lib/api";
import { registerForPushNotificationsAsync } from "@/lib/push";
import { initAnalytics } from "@/lib/analytics";
import { colors } from "@/lib/theme";

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
      try {
        const ok = await isAuthed();
        setAuthed(ok);
      } catch (e) {
        console.warn("[AuthGate] isAuthed failed:", e);
        setAuthed(false);
      }
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
      registerForPushNotificationsAsync().catch(() => {});
    }
  }, [ready, authed, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />
    </QueryClientProvider>
  );
}
