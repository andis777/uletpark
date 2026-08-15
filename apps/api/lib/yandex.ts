/**
 * Яндекс ID (OAuth) — обмен кода на токен и получение профиля.
 *
 * Контракт (docs: yandex.ru/dev/id):
 *   authorize : https://oauth.yandex.ru/authorize  ?response_type=code&client_id&redirect_uri
 *               &scope&state&code_challenge&code_challenge_method   (PKCE поддерживается)
 *   token     : POST https://oauth.yandex.ru/token
 *               grant_type=authorization_code&code&client_id&client_secret[&code_verifier]
 *   профиль   : GET https://login.yandex.ru/info?format=json
 *               заголовок «Authorization: OAuth <token>»  (именно OAuth, не Bearer)
 *
 * Важно: /info возвращает client_id, которому выдан токен. Мы его сверяем со своим —
 * иначе чужое приложение могло бы принести нам свой токен и войти под пользователем.
 */

export const YANDEX_AUTHORIZE_URL = "https://oauth.yandex.ru/authorize";
const YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token";
const YANDEX_INFO_URL = "https://login.yandex.ru/info?format=json";

export const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID ?? "";
const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET ?? "";

export function isYandexConfigured() {
  return Boolean(YANDEX_CLIENT_ID && YANDEX_CLIENT_SECRET);
}

export interface YandexProfile {
  id: string;
  login?: string;
  clientId?: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
}

/** Меняет authorization code на access token Яндекса. */
export async function exchangeYandexCode(params: {
  code: string;
  codeVerifier?: string;
  redirectUri?: string;
}): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  if (!isYandexConfigured()) return { ok: false, error: "YANDEX_NOT_CONFIGURED" };

  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    client_id: YANDEX_CLIENT_ID,
    client_secret: YANDEX_CLIENT_SECRET,
  });
  // PKCE: если приложение сгенерировало verifier — передаём его.
  if (params.codeVerifier) form.set("code_verifier", params.codeVerifier);
  // Яндекс требует redirect_uri, если он использовался при запросе кода.
  if (params.redirectUri) form.set("redirect_uri", params.redirectUri);

  try {
    const r = await fetch(YANDEX_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = (await r.json().catch(() => ({}))) as { access_token?: string; error?: string };
    if (!r.ok || !data.access_token) {
      console.warn("[yandex] обмен кода не удался:", r.status, data?.error);
      return { ok: false, error: data?.error || `HTTP_${r.status}` };
    }
    return { ok: true, accessToken: data.access_token };
  } catch (e) {
    console.warn("[yandex] token request error:", e);
    return { ok: false, error: "NETWORK" };
  }
}

/** Профиль по токену Яндекса. Проверяет, что токен выдан нашему client_id. */
export async function fetchYandexProfile(
  accessToken: string
): Promise<{ ok: true; profile: YandexProfile } | { ok: false; error: string }> {
  try {
    const r = await fetch(YANDEX_INFO_URL, {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!r.ok) {
      console.warn("[yandex] /info вернул", r.status);
      return { ok: false, error: `HTTP_${r.status}` };
    }
    const d = (await r.json()) as Record<string, unknown>;
    const id = d.id != null ? String(d.id) : "";
    if (!id) return { ok: false, error: "NO_ID" };

    // Токен обязан принадлежать нашему приложению.
    const clientId = d.client_id != null ? String(d.client_id) : undefined;
    if (clientId && YANDEX_CLIENT_ID && clientId !== YANDEX_CLIENT_ID) {
      console.warn("[yandex] токен выдан другому client_id — отклоняем");
      return { ok: false, error: "FOREIGN_TOKEN" };
    }

    const emails = Array.isArray(d.emails) ? (d.emails as string[]) : [];
    const email =
      (typeof d.default_email === "string" && d.default_email) || emails[0] || null;
    const phoneObj = d.default_phone as { number?: string } | undefined;

    return {
      ok: true,
      profile: {
        id,
        login: typeof d.login === "string" ? d.login : undefined,
        clientId,
        email: email ? email.trim().toLowerCase() : null,
        firstName: typeof d.first_name === "string" ? d.first_name : null,
        lastName: typeof d.last_name === "string" ? d.last_name : null,
        phone: phoneObj?.number ?? null,
      },
    };
  } catch (e) {
    console.warn("[yandex] /info error:", e);
    return { ok: false, error: "NETWORK" };
  }
}
