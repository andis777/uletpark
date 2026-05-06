/**
 * Cross-platform secure storage wrapper.
 * Native (iOS/Android) → expo-secure-store (Keychain / Keystore).
 * Web → localStorage (для dev preview через Expo Web).
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

interface SecureStorage {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

const webStorage: SecureStorage = {
  async getItemAsync(key) {
    if (typeof globalThis.localStorage === "undefined") return null;
    return globalThis.localStorage.getItem(key);
  },
  async setItemAsync(key, value) {
    if (typeof globalThis.localStorage === "undefined") return;
    globalThis.localStorage.setItem(key, value);
  },
  async deleteItemAsync(key) {
    if (typeof globalThis.localStorage === "undefined") return;
    globalThis.localStorage.removeItem(key);
  },
};

const nativeStorage: SecureStorage = {
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: SecureStore.setItemAsync,
  deleteItemAsync: SecureStore.deleteItemAsync,
};

export const storage: SecureStorage = Platform.OS === "web" ? webStorage : nativeStorage;
