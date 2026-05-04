import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import type {
  AuthTokens,
  BookingDTO,
  CalculatorRequest,
  CalculatorResponse,
  CreateBookingRequest,
  EventPayload,
  RequestOtpBody,
  UserProfile,
  VerifyOtpBody,
} from "@uletnaya/shared";

const API_URL = (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ?? "http://localhost:3000";

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export async function setTokens(t: { accessToken: string; refreshToken: string }) {
  await SecureStore.setItemAsync(ACCESS_KEY, t.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, t.refreshToken);
}
export async function getAccessToken() { return SecureStore.getItemAsync(ACCESS_KEY); }
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
export async function isAuthed(): Promise<boolean> {
  const t = await getAccessToken();
  return !!t;
}

class ApiError extends Error {
  constructor(public status: number, public code: string, msg?: string) { super(msg ?? code); }
}

async function call<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) };
  if (init?.auth !== false) {
    const tok = await getAccessToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let payload: { error?: string; message?: string } = {};
    try { payload = await res.json(); } catch { /* ignore */ }
    throw new ApiError(res.status, payload.error ?? "ERROR", payload.message);
  }
  return res.json() as Promise<T>;
}

/* --- Auth --- */
export const requestOtp = (body: RequestOtpBody) =>
  call<{ ok: true; expiresIn: number; devCode?: string }>("/api/auth/request-otp", {
    method: "POST", body: JSON.stringify(body), auth: false,
  });

export const verifyOtp = (body: VerifyOtpBody) =>
  call<AuthTokens & { user: UserProfile }>(
    "/api/auth/verify-otp", { method: "POST", body: JSON.stringify(body), auth: false }
  );

/* --- Me --- */
export const getMe = () => call<{ user: UserProfile }>("/api/me");
export const updateMe = (patch: Partial<Pick<UserProfile, "firstName" | "lastName" | "email">> & { pushToken?: string }) =>
  call<{ user: UserProfile }>("/api/me", { method: "PATCH", body: JSON.stringify(patch) });

/* --- Bookings --- */
export const listBookings = () => call<{ bookings: BookingDTO[] }>("/api/bookings");
export const getBooking = (id: string) => call<{ booking: BookingDTO & { notes?: string; amocrmLeadId?: number } }>(`/api/bookings/${id}`);
export const createBooking = (b: CreateBookingRequest) =>
  call<{
    booking: BookingDTO & { pointsToEarn: number; pointsUsed: number };
    calc: CalculatorResponse;
    loyalty: { pointsRemaining: number };
  }>("/api/bookings", { method: "POST", body: JSON.stringify(b) });
export const cancelBooking = (id: string) =>
  call<{ ok: true; status: string }>(`/api/bookings/${id}/cancel`, { method: "POST" });

/* --- Calculator (preview без бронирования) --- */
export const previewCalc = (req: CalculatorRequest) =>
  call<CalculatorResponse>("/api/calc", { method: "POST", body: JSON.stringify(req), auth: false });

/* --- Loyalty --- */
export const getLoyalty = () => call<{
  tier: "bronze" | "silver" | "gold";
  points: number;
  referralCode: string | null;
  referralBonusRub: number;
  nextTier: "silver" | "gold" | null;
  progress: number;
  remainingToNextTierRub: number;
  transactions: { id: string; delta: number; reason: string; bookingId: string | null; createdAt: string }[];
}>("/api/loyalty");

export const applyReferral = (code: string) =>
  call<{ ok: true; bonusRub: number }>("/api/loyalty/apply-referral", {
    method: "POST", body: JSON.stringify({ code }),
  });

/* --- Analytics --- */
export const sendEvent = (e: EventPayload) =>
  call<{ ok: true }>("/api/events", { method: "POST", body: JSON.stringify(e) }).catch(() => {});
