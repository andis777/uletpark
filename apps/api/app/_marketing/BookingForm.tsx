"use client";
import { useState, useEffect } from "react";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export function BookingForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateFrom, setDateFrom] = useState(inDays(1));
  const [dateTo, setDateTo] = useState(inDays(5));
  const [service, setService] = useState<"parking" | "nochevka">("parking");
  const [price, setPrice] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Live calc
  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (from >= to) return;
    setCalcLoading(true);
    fetch("/api/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        airport: "SVO",
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
        service,
      }),
    })
      .then(r => r.json())
      .then(d => setPrice(d.finalRub ?? d.totalRub ?? null))
      .catch(() => setPrice(null))
      .finally(() => setCalcLoading(false));
  }, [dateFrom, dateTo, service]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone) return;
    setSubmitting(true);

    // Собираем UTM-метки из URL для трекинга источника
    const utm: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(k => {
        const v = params.get(k);
        if (v) utm[k.replace("utm_", "")] = v;
      });
    }

    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, service, dateFrom, dateTo,
          source: "web-landing",
          utm: Object.keys(utm).length ? utm : undefined,
        }),
      });
      const data = await r.json();
      console.log("[lead]", data);
      if (r.ok) setSubmitted(true);
      else alert(`Не удалось отправить: ${data.error ?? r.status}. Позвоните +7 (909) 914-88-81`);
    } catch (e) {
      console.warn("[lead] network error", e);
      alert("Ошибка сети. Позвоните +7 (909) 914-88-81");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div id="booking-form" style={{
        background: "white", color: "var(--text-primary)",
        borderRadius: 20, padding: 40, boxShadow: "var(--shadow-lg)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
        <h3 style={{ color: "var(--teal-deep)", marginBottom: 12 }}>Заявка принята!</h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
          Менеджер перезвонит в течение 5 минут.<br />
          Или скачайте приложение и забронируйте сами:
        </p>
        <a href="#app" className="btn btn--primary" style={{ width: "100%" }}>
          📱 Скачать приложение
        </a>
      </div>
    );
  }

  return (
    <div id="booking-form" style={{
      background: "white", color: "var(--text-primary)",
      borderRadius: 20, padding: 28, boxShadow: "var(--shadow-lg)",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", top: -12, right: 20,
        background: "var(--primary)", color: "white",
        padding: "5px 14px", borderRadius: 100,
        fontSize: 11, fontWeight: 700, letterSpacing: 1,
      }}>
        БРОНЬ ЗА 30 СЕКУНД
      </div>

      <h3 style={{ marginBottom: 4, fontSize: 22, color: "var(--graphite)" }}>
        Забронировать парковку
      </h3>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 22 }}>
        Перезвоним в течение 5 минут
      </p>

      <form onSubmit={submit}>
        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#f4f5f7", padding: 4, borderRadius: 12 }}>
          <button type="button" onClick={() => setService("parking")} style={{
            flex: 1, padding: "10px 14px", borderRadius: 8, border: "none",
            background: service === "parking" ? "var(--primary)" : "transparent",
            color: service === "parking" ? "white" : "var(--text-secondary)",
            fontWeight: 700, fontSize: 13, transition: "all 0.15s",
          }}>🅿️ Парковка</button>
          <button type="button" onClick={() => setService("nochevka")} style={{
            flex: 1, padding: "10px 14px", borderRadius: 8, border: "none",
            background: service === "nochevka" ? "var(--primary)" : "transparent",
            color: service === "nochevka" ? "white" : "var(--text-secondary)",
            fontWeight: 700, fontSize: 13, transition: "all 0.15s",
          }}>🛏️ Ночёвка</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Имя</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Как к вам обращаться" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Телефон</label>
          <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div>
            <label>Заезд</label>
            <input type="date" required value={dateFrom} min={today()} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label>Выезд</label>
            <input type="date" required value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {/* Live price */}
        <div style={{
          background: "linear-gradient(135deg, var(--primary-soft), rgba(63,184,175,0.04))",
          border: "1px solid rgba(63,184,175,0.25)",
          borderRadius: 12, padding: 16, marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: 0.5 }}>
              ИТОГО
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {calcLoading ? "Считаем..." : price ? `${Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000)} суток · трансфер включён` : "Выберите даты"}
            </div>
          </div>
          <div style={{
            fontSize: 28, fontWeight: 300, fontFamily: "var(--font-manrope)",
            color: "var(--teal-deep)",
          }}>
            {calcLoading ? "—" : price ? `${price.toLocaleString("ru")} ₽` : "—"}
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn btn--primary btn--lg" style={{
          width: "100%", opacity: submitting ? 0.6 : 1,
        }}>
          {submitting ? "Отправляем..." : "Забронировать →"}
        </button>

        <div style={{
          marginTop: 14, fontSize: 11, color: "var(--text-muted)",
          textAlign: "center", lineHeight: 1.5,
        }}>
          Нажимая кнопку, вы соглашаетесь с <a href="/oferta" style={{ textDecoration: "underline" }}>офертой</a> и <a href="/privacy" style={{ textDecoration: "underline" }}>политикой обработки данных</a>
        </div>
      </form>
    </div>
  );
}
