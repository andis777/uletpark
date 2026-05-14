export function FinalCTA() {
  return (
    <section className="section gradient-hero" style={{
      color: "white", padding: "80px 0", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "-100px", right: "-100px",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(63,184,175,0.15), transparent 60%)",
        pointerEvents: "none",
      }} />
      <div className="container" style={{ position: "relative", textAlign: "center" }}>
        <div className="eyebrow" style={{ marginBottom: 16, color: "var(--primary)" }}>Готовы лететь?</div>
        <h2 style={{ color: "white", marginBottom: 16, maxWidth: 760, margin: "0 auto 16px" }}>
          Забронируйте сейчас — машина уже ждёт места
        </h2>
        <p style={{
          fontSize: 18, color: "rgba(255,255,255,0.75)",
          maxWidth: 600, margin: "0 auto 36px",
        }}>
          От 150 ₽ за сутки. Трансфер 24/7 бесплатно. Договор хранения. До 2 часов после прилёта — бесплатно.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#booking-form" className="btn btn--primary btn--lg">
            🅿️ Забронировать парковку
          </a>
          <a href="tel:+79099148881" style={{
            color: "white", padding: "18px 32px",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: 12, fontWeight: 700, fontSize: 16,
            display: "inline-flex", alignItems: "center", gap: 8,
          }}>
            📞 +7 (909) 914-88-81
          </a>
        </div>
        <div style={{
          marginTop: 36, fontSize: 13,
          color: "rgba(255,255,255,0.6)",
        }}>
          🛡 Договор хранения · 🚐 Трансфер 24/7 · ⭐ 4.9 на Яндекс.Картах · 📱 Приложение в RuStore
        </div>
      </div>
    </section>
  );
}
