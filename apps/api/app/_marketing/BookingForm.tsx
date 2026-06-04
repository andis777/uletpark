"use client";
import { useState, useEffect, useMemo } from "react";

// Локальные даты в формате YYYY-MM-DD без UTC-смещения (важно для <input type="date">)
function localDate(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const PARKING_LAT = 55.99127;
const PARKING_LON = 37.42298;
const PARKING_NAME = "Улётная Пит-стоп парковка";
const PARKING_ADDR = "с. Чашниково, г.о. Химки, Московская обл.";

export function BookingForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateFrom, setDateFrom] = useState<string>(() => localDate(1));
  const [dateTo, setDateTo] = useState<string>(() => localDate(5));
  const [service, setService] = useState<"parking" | "nochevka">("parking");
  const [price, setPrice] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayStr = useMemo(() => localDate(0), []);

  // Auto-fix dateTo если он раньше или равен dateFrom
  useEffect(() => {
    if (dateTo <= dateFrom) {
      const f = new Date(dateFrom + "T00:00:00");
      f.setDate(f.getDate() + 1);
      const y = f.getFullYear();
      const m = String(f.getMonth() + 1).padStart(2, "0");
      const d = String(f.getDate()).padStart(2, "0");
      setDateTo(`${y}-${m}-${d}`);
    }
  }, [dateFrom, dateTo]);

  // Live calc через /api/calc
  useEffect(() => {
    if (!dateFrom || !dateTo || dateTo <= dateFrom) return;
    setCalcLoading(true);
    const ctrl = new AbortController();
    fetch("/api/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        airport: "SVO",
        dateFrom: dateFrom + "T12:00:00Z",
        dateTo: dateTo + "T12:00:00Z",
        service,
      }),
      signal: ctrl.signal,
    })
      .then(r => r.json())
      .then(d => setPrice(d.finalRub ?? d.totalRub ?? null))
      .catch(() => setPrice(null))
      .finally(() => setCalcLoading(false));
    return () => ctrl.abort();
  }, [dateFrom, dateTo, service]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("Введите имя и телефон");
      return;
    }
    setSubmitting(true);

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
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          service,
          dateFrom,
          dateTo,
          source: "web-landing",
          utm: Object.keys(utm).length ? utm : undefined,
        }),
      });
      const data = await r.json();
      console.log("[lead]", data);
      if (r.ok) {
        setSubmitted(true);
        // Метрики целей (если подключены)
        try {
          (window as any).gtag?.("event", "booking_submit", { value: price ?? 0 });
          (window as any).ym?.(0, "reachGoal", "booking_submit");
        } catch {}
      } else {
        setError(`Не удалось отправить (${data.error ?? r.status}). Позвоните +7 (909) 914-88-81`);
      }
    } catch {
      setError("Ошибка сети. Позвоните +7 (909) 914-88-81");
    } finally {
      setSubmitting(false);
    }
  }

  const days = dateFrom && dateTo && dateTo > dateFrom
    ? Math.ceil((new Date(dateTo + "T12:00:00").getTime() - new Date(dateFrom + "T12:00:00").getTime()) / 86_400_000)
    : 0;

  return (
    <>
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
              flex: 1, padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: service === "parking" ? "var(--primary)" : "transparent",
              color: service === "parking" ? "white" : "var(--text-secondary)",
              fontWeight: 700, fontSize: 13, transition: "all 0.15s",
            }}>🅿️ Парковка</button>
            <button type="button" onClick={() => setService("nochevka")} style={{
              flex: 1, padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              background: service === "nochevka" ? "var(--primary)" : "transparent",
              color: service === "nochevka" ? "white" : "var(--text-secondary)",
              fontWeight: 700, fontSize: 13, transition: "all 0.15s",
            }}>🛏️ Ночёвка</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Имя</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Как к вам обращаться" autoComplete="name" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Телефон</label>
            <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" autoComplete="tel" inputMode="tel" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Email <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(подтверждение брони)</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div>
              <label>Заезд</label>
              <input
                type="date"
                required
                value={dateFrom}
                min={todayStr}
                onChange={e => setDateFrom(e.target.value || todayStr)}
              />
            </div>
            <div>
              <label>Выезд</label>
              <input
                type="date"
                required
                value={dateTo}
                min={dateFrom}
                onChange={e => setDateTo(e.target.value || dateFrom)}
              />
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, var(--primary-soft), rgba(63,184,175,0.04))",
            border: "1px solid rgba(63,184,175,0.25)",
            borderRadius: 12, padding: 16, marginBottom: 16,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: 0.5 }}>
                ИТОГО
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {calcLoading ? "Считаем..." : days > 0 ? `${days} ${days === 1 ? "сутки" : "суток"} · трансфер включён` : "Выберите даты"}
              </div>
            </div>
            <div style={{
              fontSize: 28, fontWeight: 300, fontFamily: "var(--font-manrope)",
              color: "var(--teal-deep)",
            }}>
              {calcLoading ? "—" : price ? `${price.toLocaleString("ru")} ₽` : "—"}
            </div>
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", color: "#991b1b",
              padding: "10px 12px", borderRadius: 10,
              fontSize: 13, marginBottom: 12,
            }}>{error}</div>
          )}

          <button type="submit" disabled={submitting} className="btn btn--primary btn--lg" style={{
            width: "100%", opacity: submitting ? 0.6 : 1, marginBottom: 12,
          }}>
            {submitting ? "Отправляем..." : "Забронировать →"}
          </button>

          <button
            type="button"
            onClick={() => setMapOpen(true)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "1.5px solid var(--primary)",
              background: "white",
              color: "var(--teal-deep)",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>📍</span> Схема проезда
          </button>

          <div style={{
            marginTop: 14, fontSize: 11, color: "var(--text-muted)",
            textAlign: "center", lineHeight: 1.5,
          }}>
            Нажимая кнопку, вы соглашаетесь с <a href="/oferta" style={{ textDecoration: "underline" }}>офертой</a> и <a href="/privacy" style={{ textDecoration: "underline" }}>политикой обработки данных</a>
          </div>
        </form>
      </div>

      {/* === МОДАЛКА ПОДТВЕРЖДЕНИЯ БРОНИ === */}
      {submitted && (
        <div
          onClick={() => setSubmitted(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(15,20,25,0.7)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 24, padding: 40,
              maxWidth: 520, width: "100%", textAlign: "center",
              boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
              position: "relative",
              animation: "popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <button
              onClick={() => setSubmitted(false)}
              aria-label="Закрыть"
              style={{
                position: "absolute", top: 16, right: 16,
                width: 32, height: 32, borderRadius: 16, border: "none",
                background: "#f4f5f7", color: "#1a1d24",
                fontSize: 18, cursor: "pointer", lineHeight: 1,
              }}
            >×</button>

            <div style={{
              width: 80, height: 80, margin: "0 auto 20px",
              background: "linear-gradient(135deg, #3FB8AF, #1a6e4e)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, color: "white",
              boxShadow: "0 8px 24px rgba(63,184,175,0.4)",
            }}>✓</div>

            <h2 style={{
              fontSize: 24, fontWeight: 700, marginBottom: 8,
              color: "var(--teal-deep)",
            }}>
              Уважаемый {name.trim() || "клиент"}!
            </h2>
            <p style={{
              fontSize: 16, color: "var(--text-secondary)",
              marginBottom: 20, lineHeight: 1.55,
            }}>
              <strong style={{ color: "var(--teal-deep)" }}>Бронирование подтверждено</strong> 🎉<br />
              Ожидаем вас {new Date(dateFrom + "T12:00:00").toLocaleDateString("ru", { day: "numeric", month: "long" })}.
              Менеджер перезвонит на <strong>{phone || "указанный номер"}</strong> в течение 5 минут{email && (<><br />и продублирует подтверждение на <strong>{email}</strong></>)}.
            </p>

            {price && (
              <div style={{
                background: "var(--primary-soft)",
                border: "1px dashed rgba(63,184,175,0.4)",
                padding: "12px 16px", borderRadius: 12,
                marginBottom: 20,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "left" }}>
                  {service === "parking" ? "Парковка" : "Ночёвка"} · {days} {days === 1 ? "сутки" : "суток"}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--teal-deep)" }}>
                  {price.toLocaleString("ru")} ₽
                </div>
              </div>
            )}

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              marginBottom: 16,
            }}>
              <button
                onClick={() => { setSubmitted(false); setMapOpen(true); }}
                style={{
                  padding: "12px 16px", borderRadius: 12,
                  border: "1.5px solid var(--primary)", background: "white",
                  color: "var(--teal-deep)", fontWeight: 700, fontSize: 14, cursor: "pointer",
                }}
              >📍 Схема проезда</button>
              <a
                href="tel:+79099148881"
                style={{
                  padding: "12px 16px", borderRadius: 12,
                  background: "var(--primary)", color: "white",
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >📞 Позвонить</a>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Бронь №{Date.now().toString(36).slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {/* === МОДАЛКА КАРТЫ === */}
      {mapOpen && (
        <div
          onClick={() => setMapOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(15,20,25,0.7)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16, animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 24, padding: 24,
              maxWidth: 720, width: "100%",
              boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
              position: "relative",
              animation: "popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <button
              onClick={() => setMapOpen(false)}
              aria-label="Закрыть"
              style={{
                position: "absolute", top: 16, right: 16,
                width: 32, height: 32, borderRadius: 16, border: "none",
                background: "#f4f5f7", color: "#1a1d24",
                fontSize: 18, cursor: "pointer", lineHeight: 1, zIndex: 1,
              }}
            >×</button>

            <h3 style={{ marginBottom: 4, fontSize: 20, color: "var(--graphite)" }}>
              📍 Как нас найти
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              {PARKING_ADDR} · 5 минут до терминала
            </p>

            <iframe
              title="Карта Улётной парковки"
              src={`https://yandex.ru/map-widget/v1/?ll=${PARKING_LON}%2C${PARKING_LAT}&z=15&pt=${PARKING_LON},${PARKING_LAT},pm2rdl&l=map`}
              style={{
                width: "100%", height: 380,
                border: 0, borderRadius: 12, marginBottom: 16,
              }}
              loading="lazy"
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <a
                href={`https://yandex.ru/maps/?rtext=~${PARKING_LAT},${PARKING_LON}&rtt=auto`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "14px 16px", borderRadius: 12,
                  background: "var(--primary)", color: "white",
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  textAlign: "center",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >🧭 Построить маршрут</a>
              <a
                href={`yandexnavi://build_route_on_map?lat_to=${PARKING_LAT}&lon_to=${PARKING_LON}`}
                style={{
                  padding: "14px 16px", borderRadius: 12,
                  border: "1.5px solid var(--primary)", background: "white",
                  color: "var(--teal-deep)", fontWeight: 700, fontSize: 14, textDecoration: "none",
                  textAlign: "center",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >📱 Открыть в Яндекс.Навигаторе</a>
            </div>

            <div style={{
              marginTop: 16, padding: 14,
              background: "var(--surface-muted)", borderRadius: 12,
              fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
            }}>
              <strong style={{ color: "var(--teal-deep)" }}>{PARKING_NAME}</strong><br />
              📞 <a href="tel:+79099148881" style={{ color: "var(--teal-deep)" }}>+7 (909) 914-88-81</a><br />
              🚐 Бесплатный трансфер до терминала 24/7
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
