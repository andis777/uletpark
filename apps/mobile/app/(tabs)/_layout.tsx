import { Tabs } from "expo-router";
import { LOYALTY_VISIBLE } from "@/lib/flags";
import { CustomTabBar } from "@/components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная" }} />
      <Tabs.Screen name="bookings" options={{ title: "Брони" }} />
      <Tabs.Screen name="loyalty" options={{ title: "Карта", href: LOYALTY_VISIBLE ? undefined : null }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль" }} />
    </Tabs>
  );
}
