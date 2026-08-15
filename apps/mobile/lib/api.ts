import Constants from "expo-constants";
import { storage } from "./storage";
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
  await storage.setItemAsync(ACCESS_KEY, t.accessToken);
  await storage.setItemAsync(REFRESH_KEY, t.refreshToken);
}
export async function getAccessToken() { return storage.getItemAsync(ACCESS_KEY); }
export async function clearTokens() {
  await storage.deleteItemAsync(ACCESS_KEY);
  await storage.deleteItemAsync(REFRESH_KEY);
}
export async function isAuthed(): Promise<boolean> {
  const t = await getAccessToken();
  return !!t;
}

class ApiError extends Error {
  constructor(public status: number, public code: string, msg?: string) { super(msg ?? code); }
}

async function call<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const method = init?.method || "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) };
  if (init?.auth !== false) {
    const tok = await getAccessToken();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  }

  const t0 = Date.now();
  console.log(`[api] → ${method} ${path}${init?.body ? ` body=${typeof init.body === "string" ? init.body.slice(0, 200) : "[binary]"}` : ""}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (e) {
    console.error(`[api] ✗ network ${method} ${path} (${Date.now() - t0}ms):`, e);
    throw e;
  }

  const ms = Date.now() - t0;

  if (!res.ok) {
    let payload: { error?: string; message?: string } = {};
    try { payload = await res.json(); } catch { /* ignore */ }
    console.warn(`[api] ✗ ${method} ${path} → ${res.status} ${payload.error ?? ""} (${ms}ms)`);
    throw new ApiError(res.status, payload.error ?? "ERROR", payload.message);
  }

  const data = await res.json() as T;
  // Сжатый превью данных (длинные ответы — обрезаем)
  const preview = JSON.stringify(data).slice(0, 200);
  console.log(`[api] ✓ ${method} ${path} → ${res.status} (${ms}ms) ${preview}${preview.length === 200 ? "..." : ""}`);
  return data;
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

/* --- Вход по коду: e-mail (основной канал) или телефон ---
   SMS дорогие и часто не доходят (отправитель не подключён у части операторов),
   поэтому основной способ входа — код на почту. */

export type CodeChannel = "email" | "sms";

export const requestCode = (target: { email?: string; phone?: string }) =>
  call<{ ok: true; channel: CodeChannel; expiresIn: number; devCode?: string }>(
    "/api/auth/request-code",
    { method: "POST", body: JSON.stringify(target), auth: false }
  );

/** Вход через Яндекс ID: отдаём серверу authorization code, обмен делает он. */
export const loginWithYandex = (body: { code: string; codeVerifier?: string; redirectUri?: string }) =>
  call<AuthTokens & {
    user: UserProfile;
    isNewUser: boolean;
    needsPhone: boolean;
    linkedBookings: number;
  }>("/api/auth/yandex", { method: "POST", body: JSON.stringify(body), auth: false });

export const verifyCode = (body: { email?: string; phone?: string; code: string }) =>
  call<AuthTokens & {
    user: UserProfile;
    isNewUser: boolean;
    needsPhone: boolean;   // true — телефон спросим на первой броне
    linkedBookings: number;
  }>("/api/auth/verify-code", { method: "POST", body: JSON.stringify(body), auth: false });

/* --- Me --- */
export const getMe = () => call<{ user: UserProfile }>("/api/me");
export const updateMe = (patch: Partial<Pick<UserProfile, "firstName" | "lastName" | "email">> & { pushToken?: string }) =>
  call<{ user: UserProfile }>("/api/me", { method: "PATCH", body: JSON.stringify(patch) });
export const deleteMe = () =>
  call<{ ok: true; deletedAt: string }>("/api/me", { method: "DELETE" });

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

/* --- Sync броней из amoCRM по своему телефону --- */
export const syncMyBookings = () =>
  call<{ ok: true; linkedBookings: number; phone: string }>(
    "/api/bookings/sync-mine", { method: "POST" }
  );

/* --- Calculator (preview без бронирования) --- */
export type CalcRequestExtended = CalculatorRequest & {
  service?: "parking" | "nochevka";
  nochevkaHours?: 6 | 12 | 24;
};
export const previewCalc = (req: CalcRequestExtended) =>
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

/* --- Зеркалим бронь из приложения в WP lead-receiver.php ---
   Без этого заявки из приложения не попадают в группу MAX / лог заявок
   (сайт шлёт туда, приложение — только в VPS API). Помечаем source:'app',
   чтобы в MAX строкой «Откуда» было видно «📲 Приложение». Fire-and-forget. */
const WP_LEAD_URL = "https://uletnayaparkovka.ru/lead-receiver.php";
export async function notifyWebLead(lead: {
  dateFrom: string;
  dateTo: string;
  price?: number | string;
  email?: string;
  name?: string;
  phone?: string;
  page?: string;
}): Promise<void> {
  try {
    let phone = lead.phone;
    let name = lead.name;
    if (!phone) {
      try {
        const me = await getMe();
        phone = me.user.phone;
        if (!name) name = [me.user.firstName, me.user.lastName].filter(Boolean).join(" ") || undefined;
      } catch { /* профиль недоступен — пропускаем */ }
    }
    if (!phone) return; // без телефона lead-receiver не отправит уведомление в MAX
    await fetch(WP_LEAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        name: name ?? "",
        dateFrom: lead.dateFrom,
        dateTo: lead.dateTo,
        price: lead.price != null ? String(lead.price) : "",
        email: lead.email ?? "",
        source: "app",
        page: lead.page ?? "app",
      }),
    });
  } catch { /* fire-and-forget: не мешаем основному потоку бронирования */ }
}
