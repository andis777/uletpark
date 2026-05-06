/**
 * Platform-aware UI helpers.
 * Alert.alert не работает в react-native-web — используем window.alert/confirm на web.
 */

import { Alert, Platform } from "react-native";

export async function confirmAction(title: string, message?: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return globalThis.confirm?.(title + (message ? "\n\n" + message : "")) ?? true;
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Отмена", style: "cancel", onPress: () => resolve(false) },
      { text: "OK",     style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    globalThis.alert?.(title + (message ? "\n\n" + message : ""));
    return;
  }
  Alert.alert(title, message);
}
