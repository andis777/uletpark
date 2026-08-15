"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Вход в кабинет по коду на почту.
 * Переиспользует те же ручки, что и мобильное приложение
 * (/api/auth/request-code и /api/auth/verify-code), но с флагом web:true —
 * сервер тогда дополнительно кладёт сессию в httpOnly cookie.
 */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email.trim());
  const codeOk = code.trim().length === 6;

  async function post(url: string, body: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || `HTTP_${r.status}`);
    return data;
  }

  async function requestCode() {
    setErr(null); setInfo(null); setBusy(true);
    try {
      const d = await post("/api/auth/request-code", { email: email.trim() });
      setInfo(d.devCode ? `Тестовый код: ${d.devCode}` : "Код отправлен. Проверьте почту, в том числе «Спам».");
      setStep("code");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(
        m.includes("EMAIL_SEND_FAILED") ? "Не удалось отправить письмо. Попробуйте позже."
        : m.includes("TOO_MANY_REQUESTS") ? "Слишком много попыток. Подождите несколько минут."
        : m.includes("INVALID_EMAIL") ? "Проверьте адрес почты."
        : "Не удалось отправить код."
      );
    } finally { setBusy(false); }
  }

  async function verify() {
    setErr(null); setBusy(true);
    try {
      await post("/api/auth/verify-code", { email: email.trim(), code: code.trim(), web: true });
      router.replace("/cabinet");
      router.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(
        m.includes("INVALID_CODE") ? "Неверный код. Проверьте и введите ещё раз."
        : m.includes("CODE_NOT_FOUND_OR_EXPIRED") ? "Срок действия кода истёк — запросите новый."
        : m.includes("TOO_MANY_ATTEMPTS") ? "Слишком много попыток. Запросите новый код."
        : "Не удалось войти."
      );
    } finally { setBusy(false); }
  }

  return (
    <div>
      {step === "email" ? (
        <>
          <label style={label} htmlFor="cab-email">Электронная почта</label>
          <input
            id="cab-email"
            style={input}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && emailOk && !busy) requestCode(); }}
            autoFocus
          />
          <button style={{ ...btn, ...(busy || !emailOk ? btnOff : null) }} onClick={requestCode} disabled={busy || !emailOk}>
            {busy ? "Отправляем…" : "Получить код"}
          </button>
        </>
      ) : (
        <>
          <label style={label} htmlFor="cab-code">Код из письма</label>
          <input
            id="cab-code"
            style={{ ...input, letterSpacing: 8, fontSize: 22, textAlign: "center" }}
            inputMode="numeric"
            maxLength={6}
            placeholder="______"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter" && codeOk && !busy) verify(); }}
            autoFocus
          />
          <button style={{ ...btn, ...(busy || !codeOk ? btnOff : null) }} onClick={verify} disabled={busy || !codeOk}>
            {busy ? "Входим…" : "Войти"}
          </button>
          <button style={linkBtn} onClick={() => { setStep("email"); setCode(""); setErr(null); setInfo(null); }}>
            Изменить почту
          </button>
        </>
      )}
      {info && <p style={okMsg}>{info}</p>}
      {err && <p style={errMsg}>{err}</p>}
    </div>
  );
}

const label: React.CSSProperties = { display: "block", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "#5c6b76", fontWeight: 700, marginBottom: 6 };
const input: React.CSSProperties = { width: "100%", padding: "13px 14px", fontSize: 16, border: "1px solid #d9e3e6", borderRadius: 10, background: "#f9fbfb", color: "#14303f", marginBottom: 12, boxSizing: "border-box" };
const btn: React.CSSProperties = { width: "100%", padding: "14px 16px", fontSize: 15, fontWeight: 700, color: "#fff", background: "#86a82a", border: 0, borderRadius: 10, cursor: "pointer" };
const btnOff: React.CSSProperties = { opacity: 0.5, cursor: "default" };
const linkBtn: React.CSSProperties = { width: "100%", marginTop: 10, padding: 8, background: "none", border: 0, color: "#1a8f86", fontSize: 13, cursor: "pointer" };
const okMsg: React.CSSProperties = { marginTop: 12, fontSize: 13, color: "#2f7a44", background: "#f1f8ec", border: "1px solid #d9ecc7", borderRadius: 8, padding: "9px 12px" };
const errMsg: React.CSSProperties = { marginTop: 12, fontSize: 13, color: "#b03a2e", background: "#fdecea", border: "1px solid #f5c6c0", borderRadius: 8, padding: "9px 12px" };
