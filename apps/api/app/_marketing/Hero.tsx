import { BookingForm } from "./BookingForm";

export function Hero() {
  return (
    <section id="hero" className="gradient-hero" style={{
      color: "white",
      padding: "72px 0 88px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Декоративные элементы */}
      <div style={{
        position: "absolute", top: "-200px", right: "-200px",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(63,184,175,0.12), transparent 60%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-150px", left: "-150px",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(63,184,175,0.08), transparent 60%)",
        pointerEvents: "none",
      }} />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1.1fr 0.9fr",
          gap: 56, alignItems: "center",
        }} className="hero-grid">
          {/* Left: text + USP */}
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(63,184,175,0.18)", color: "var(--primary)",
              padding: "6px 14px", borderRadius: 100, fontSize: 12,
              fontWeight: 700, letterSpacing: 1, marginBottom: 20,
            }}>
              ⭐ 4.9 из 5 · 47+ отзывов на Яндекс.Картах
            </div>

            <h1 style={{ color: "white", marginBottom: 20 }}>
              Парковка Шереметьево —<br />
              <span style={{ color: "var(--primary)", fontWeight: 600 }}>5 минут до&nbsp;терминала</span>
            </h1>

            <p style={{ fontSize: 19, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", marginBottom: 32, maxWidth: 540 }}>
              Бесплатный трансфер 24/7 с первого дня. От 150 ₽/сутки. Договор хранения. <strong style={{ color: "white" }}>Не успели на самолёт — парковка бесплатно.</strong>
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
              {[
                { ico: "🛡", t: "Договор хранения" },
                { ico: "🚐", t: "Трансфер 24/7" },
                { ico: "📱", t: "Приложение в RuStore" },
                { ico: "💰", t: "До 800 ₽ экономии" },
              ].map((b, i) => (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.08)", padding: "8px 14px",
                  borderRadius: 100, fontSize: 13, fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}>
                  <span style={{ fontSize: 16 }}>{b.ico}</span>{b.t}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "center" }} className="hero-cta">
              <a href="#booking-form" className="btn btn--primary btn--lg">
                Забронировать за 30 секунд →
              </a>
              <a href="tel:+79099148881" style={{
                color: "white", fontWeight: 700, fontSize: 16,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                📞 +7 (909) 914-88-81
              </a>
            </div>

            <div style={{
              marginTop: 32, paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.15)",
              display: "flex", gap: 32, flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--font-manrope)" }}>10</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>лет на рынке</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--font-manrope)" }}>50k+</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>довольных клиентов</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--font-manrope)" }}>24/7</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>трансфер и охрана</div>
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 300, fontFamily: "var(--font-manrope)" }}>5 мин</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>до терминала</div>
              </div>
            </div>
          </div>

          {/* Right: live form */}
          <BookingForm />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-cta { flex-direction: column; align-items: stretch !important; }
          .hero-cta a { width: 100%; justify-content: center; }
        }
      `}</style>
    </section>
  );
}
