"use client";
import { useState } from "react";

export function B2BForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      companyName: String(fd.get("companyName") || "").trim(),
      inn: String(fd.get("inn") || "").trim() || undefined,
      contactPerson: String(fd.get("contactPerson") || "").trim(),
      position: String(fd.get("position") || "").trim() || undefined,
      phone: String(fd.get("phone") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      carsPerMonth: String(fd.get("carsPerMonth") || "1-5") as "1-5" | "6-20" | "21-50" | "50+",
      message: String(fd.get("message") || "").trim() || undefined,
      source: "b2b-landing",
    };

    try {
      const r = await fetch("/api/leads-b2b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (r.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Не удалось отправить");
      }
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{
        background: "#fff", color: "var(--text-primary)",
        borderRadius: 20, padding: 40, boxShadow: "var(--shadow-lg)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h3 style={{ color: "var(--teal-deep)", marginBottom: 12 }}>Заявка принята!</h3>
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Корпоративный менеджер свяжется с вами в течение часа.<br />
          Подготовит коммерческое предложение под ваш объём.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", color: "var(--text-primary)",
      borderRadius: 20, padding: 28, boxShadow: "var(--shadow-lg)",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: -12, right: 20,
        background: "var(--primary)", color: "#fff",
        padding: "5px 14px", borderRadius: 100,
        fontSize: 11, fontWeight: 700, letterSpacing: 1,
      }}>BUSINESS</div>

      <h3 style={{ marginBottom: 4, fontSize: 22, color: "var(--graphite)" }}>
        Заявка на B2B-договор
      </h3>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 22 }}>
        Перезвоним в течение часа · обсудим условия
      </p>

      <form onSubmit={submit}>
        <label>Название компании *</label>
        <input name="companyName" required maxLength={120} placeholder="ООО «Ромашка»" />

        <label>ИНН (опционально)</label>
        <input name="inn" maxLength={12} placeholder="7701234567" inputMode="numeric" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label>ФИО контакта *</label>
            <input name="contactPerson" required maxLength={80} placeholder="Иванов Иван" />
          </div>
          <div>
            <label>Должность</label>
            <input name="position" maxLength={80} placeholder="Менеджер" />
          </div>
        </div>

        <label>Телефон *</label>
        <input name="phone" type="tel" required placeholder="+7 (___) ___-__-__" autoComplete="tel" />

        <label>Email *</label>
        <input name="email" type="email" required placeholder="manager@company.ru" autoComplete="email" />

        <label>Сколько машин в месяц *</label>
        <select name="carsPerMonth" required defaultValue="1-5">
          <option value="1-5">1–5 машин</option>
          <option value="6-20">6–20 машин</option>
          <option value="21-50">21–50 машин</option>
          <option value="50+">Более 50 машин</option>
        </select>

        <label>Сообщение (опционально)</label>
        <textarea
          name="message"
          rows={3}
          maxLength={1000}
          placeholder="Особые требования, доп. услуги, регионы..."
          style={{
            width: "100%", padding: "12px 14px",
            border: "1.5px solid var(--divider)", borderRadius: "var(--radius-md)",
            fontSize: 15, marginBottom: 12, fontFamily: "inherit", resize: "vertical",
          }}
        />

        {error && (
          <div style={{
            background: "#fef2f2", color: "#991b1b",
            padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 12,
          }}>{error}. Позвоните +7 (909) 914-88-81</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn btn--primary btn--lg"
          style={{ width: "100%", opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? "Отправляем..." : "Отправить заявку →"}
        </button>

        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
          Корпоративный менеджер свяжется в течение часа
        </div>
      </form>
    </div>
  );
}
