import { Tabs } from "expo-router";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная" }} />
      <Tabs.Screen name="bookings" options={{ title: "Брони" }} />
      <Tabs.Screen name="loyalty" options={{ title: "Карта" }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль" }} />
    </Tabs>
  );
}
