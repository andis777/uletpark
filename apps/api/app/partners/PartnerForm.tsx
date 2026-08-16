"use client";

import { useState } from "react";

export function PartnerForm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setState("busy");

    const f = new FormData(e.currentTarget);
    const spacesRaw = String(f.get("spaces") ?? "").trim();
    const body = {
      company: String(f.get("company") ?? "").trim() || undefined,
      contactName: String(f.get("contactName") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      email: String(f.get("email") ?? "").trim() || undefined,
      city: String(f.get("city") ?? "").trim(),
      airport: String(f.get("airport") ?? "").trim(),
      spaces: spacesRaw ? Number(spacesRaw) : undefined,
      hasTransfer: f.get("hasTransfer") === "on",
      message: String(f.get("message") ?? "").trim() || undefined,
    };

    try {
      const r = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setState("done");
        return;
      }
      const j = await r.json().catch(() => ({}));
      // Шереметьево отсекается на сервере — показываем его объяснение как есть.
      setError(j.message ?? "Не удалось отправить. Проверьте телефон и обязательные поля.");
      setState("idle");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз или позвоните нам.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div style={ok}>
        <b style={{ fontSize: 16 }}>Заявка принята</b>
        <p style={{ marginTop: 8, lineHeight: 1.5 }}>
          Свяжемся в ближайший рабочий день, обсудим условия и объём трафика по вашему аэропорту.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={form}>
      <div style={row}>
        <Field name="contactName" label="Ваше имя" required />
        <Field name="phone" label="Телефон" type="tel" required placeholder="+7 900 000-00-00" />
      </div>
      <div style={row}>
        <Field name="company" label="Компания" />
        <Field name="email" label="Почта" type="email" />
      </div>
      <div style={row}>
        <Field name="city" label="Город" required placeholder="Казань" />
        <Field name="airport" label="Аэропорт" required placeholder="Казань (KZN)" />
      </div>
      <div style={row}>
        <Field name="spaces" label="Мест на площадке" type="number" placeholder="120" />
        <label style={{ ...fieldWrap, flexDirection: "row", alignItems: "center", gap: 9, paddingTop: 22 }}>
          <input type="checkbox" name="hasTransfer" style={{ width: 17, height: 17 }} />
          <span style={{ fontSize: 13.5, color: "#14303f" }}>Есть свой трансфер до терминала</span>
        </label>
      </div>

      <label style={fieldWrap}>
        <span style={label}>Коротко о площадке</span>
        <textarea name="message" rows={3} style={{ ...input, resize: "vertical" }}
          placeholder="Охрана, покрытие, сколько лет работаете, загрузка" />
      </label>

      {error && <div style={errBox}>{error}</div>}

      <button type="submit" disabled={state === "busy"} style={submitBtn}>
        {state === "busy" ? "Отправляем…" : "Отправить заявку"}
      </button>
      <p style={legal}>
        Отправляя форму, вы соглашаетесь с{" "}
        <a href="https://uletnayaparkovka.ru/politika-konfidencialnosti" style={{ color: "#1a8f86" }}>
          политикой обработки персональных данных
        </a>.
      </p>
    </form>
  );
}

function Field({ name, label: text, type = "text", required, placeholder }: {
  name: string; label: string; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label style={fieldWrap}>
      <span style={label}>{text}{required && <span style={{ color: "#c0553f" }}> *</span>}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} style={input} />
    </label>
  );
}

const form: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const row: React.CSSProperties = { display: "flex", gap: 14, flexWrap: "wrap" };
const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", flex: "1 1 220px", marginBottom: 14 };
const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", color: "#5c6b76", marginBottom: 6 };
const input: React.CSSProperties = {
  border: "1px solid #d5e0e4", borderRadius: 10, padding: "11px 13px", fontSize: 15,
  fontFamily: "inherit", color: "#14303f", background: "#fff", width: "100%", boxSizing: "border-box",
};
const submitBtn: React.CSSProperties = {
  background: "#86a82a", color: "#fff", border: 0, borderRadius: 11, padding: "14px 20px",
  fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4,
};
const errBox: React.CSSProperties = {
  background: "#fdf1ee", border: "1px solid #f2d3ca", color: "#a2472f",
  borderRadius: 10, padding: "11px 13px", fontSize: 13.5, marginBottom: 10, lineHeight: 1.45,
};
const ok: React.CSSProperties = {
  background: "#f1f9f3", border: "1px solid #d6ecdc", borderRadius: 14,
  padding: "22px 24px", color: "#2f7a44", fontSize: 14,
};
const legal: React.CSSProperties = { fontSize: 11.5, color: "#8a97a1", marginTop: 12, lineHeight: 1.5 };
