/**
 * Аналитика для Expo: оборачивает sendEvent и автогенерирует session_id,
 * собирает device info, поддерживает app_open / screen_view.
 */

import { Platform, AppState } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { sendEvent } from "./api";
import type { EventPayload } from "@uletnaya/shared";

const SESSION_KEY = "up_analytics_session";
const SESSION_TTL_MS = 30 * 60 * 1000;

let _sessionId: string | null = null;
let _sessionStarted = 0;

async function ensureSession(): Promise<string> {
  const now = Date.now();
  if (_sessionId && now - _sessionStarted < SESSION_TTL_MS) return _sessionId;
  try {
    const cached = await SecureStore.getItemAsync(SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { id: string; last: number };
      if (now - parsed.last < SESSION_TTL_MS) {
        _sessionId = parsed.id; _sessionStarted = parsed.last;
        return _sessionId;
      }
    }
  } catch {}
  _sessionId = `s_${Math.random().toString(36).slice(2, 10)}_${now.toString(36)}`;
  _sessionStarted = now;
  try { await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ id: _sessionId, last: now })); } catch {}
  return _sessionId;
}

function deviceInfo() {
  return {
    os: Platform.OS,
    osVersion: Platform.Version,
    appVersion: Constants.expoConfig?.version,
    deviceModel: Constants.deviceName ?? null,
  };
}

export async function track(name: string, props?: Record<string, unknown>) {
  const sessionId = await ensureSession();
  const payload: EventPayload = {
    eventName: name,
    sessionId,
    source: Platform.OS === "ios" ? "ios" : "android",
    properties: props,
    deviceInfo: deviceInfo(),
  };
  void sendEvent(payload);
}

/* Жизненный цикл app */
let _appOpenSent = false;
export function initAnalytics() {
  if (!_appOpenSent) {
    track("app_open").catch(() => {});
    _appOpenSent = true;
  }
  AppState.addEventListener("change", (state) => {
    if (state === "active") track("app_resume").catch(() => {});
    if (state === "background") track("app_background").catch(() => {});
  });
}

/* Утилиты для частых событий */
export const analytics = {
  screenView: (screen: string, props?: Record<string, unknown>) =>
    track("screen_view", { screen, ...props }),
  authStarted: () => track("auth_started"),
  authCompleted: () => track("auth_completed"),
  calcStarted: (props?: Record<string, unknown>) => track("calc_started", props),
  calcChanged: (props: Record<string, unknown>) => track("calc_changed", props),
  bookingStarted: () => track("booking_started"),
  bookingCreated: (props: Record<string, unknown>) => track("booking_created", props),
  bookingCancelled: (id: string) => track("booking_cancelled", { id }),
  loyaltyViewed: (tier: string) => track("loyalty_viewed", { tier }),
  referralShared: () => track("referral_shared"),
  referralApplied: (props: Record<string, unknown>) => track("referral_applied", props),
};
