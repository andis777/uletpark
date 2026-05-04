import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#3FB8AF", tabBarStyle: { backgroundColor: "#1F2430", borderTopWidth: 0 }, headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Главная" }} />
      <Tabs.Screen name="bookings" options={{ title: "Брони" }} />
      <Tabs.Screen name="loyalty" options={{ title: "Карта" }} />
      <Tabs.Screen name="profile" options={{ title: "Профиль" }} />
    </Tabs>
  );
}
