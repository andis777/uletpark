export function AppShowcase() {
  const features = [
    { ico: "📅", title: "Бронь за 30 секунд", desc: "Выбрали даты, оплатили — готово" },
    { ico: "🔔", title: "Push о трансфере", desc: "«Через 7 минут водитель приедет»" },
    { ico: "💰", title: "Бонусная программа", desc: "1 ₽ = 1 балл, тиры до Gold" },
    { ico: "🗂", title: "История поездок", desc: "Все ваши брони в одном месте" },
    { ico: "🎁", title: "Реферальные коды", desc: "Друг получает скидку, вы — баллы" },
    { ico: "📱", title: "QR-вход на парковку", desc: "Без бумаг, без шлагбаума" },
  ];

  return (
    <section id="app" className="section dark-section" style={{
      background: "linear-gradient(180deg, var(--graphite) 0%, var(--teal-mid) 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div className="container">
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 64, alignItems: "center",
        }} className="app-grid">
          {/* Left: phone mockup */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
            <div style={{
              width: 280, height: 580,
              background: "linear-gradient(180deg, #1a1d24, #0f1419)",
              borderRadius: 40, padding: 12,
              boxShadow: "0 24px 60px rgba(0,0,0,0.4), 0 0 80px rgba(63,184,175,0.15)",
              border: "1px solid rgba(255,255,255,0.1)",
              position: "relative",
            }}>
              {/* Notch */}
              <div style={{
                position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                width: 120, height: 28, background: "#000", borderRadius: 14, zIndex: 2,
              }} />
              <div style={{
                width: "100%", height: "100%", borderRadius: 30,
                background: "white", overflow: "hidden", position: "relative",
              }}>
                {/* App content mockup */}
                <div style={{
                  background: "var(--graphite)", color: "white",
                  padding: "44px 20px 24px",
                }}>
                  <div style={{ fontSize: 10, color: "var(--primary)", letterSpacing: 2, fontWeight: 700 }}>✈ УЛЁТНАЯ ПАРКОВКА</div>
                  <div style={{ fontSize: 22, fontWeight: 300, marginTop: 8 }}>Привет, Алексей!</div>
                </div>
                <div style={{
                  margin: "12px 16px", background: "var(--primary)", color: "white",
                  padding: 18, borderRadius: 16,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, opacity: 0.9 }}>BRONZE</div>
                  <div style={{ fontSize: 28, fontWeight: 300, marginTop: 6, fontFamily: "var(--font-manrope)" }}>1 240</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>баллов · 1 балл = 1 ₽</div>
                </div>
                <div style={{ padding: "0 16px" }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--text-secondary)", fontWeight: 700, margin: "12px 0 8px" }}>АКТИВНЫЕ БРОНИ</div>
                  <div style={{
                    background: "white", padding: 14, borderRadius: 12,
                    boxShadow: "var(--shadow-md)", marginBottom: 8,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>✈ SVO</div>
                      <div style={{ fontSize: 9, padding: "2px 8px", borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary-dark)", fontWeight: 700 }}>НОВАЯ</div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>1 — 14 мая</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>М320СО177</div>
                    <div style={{ fontSize: 16, fontWeight: 300, marginTop: 8, fontFamily: "var(--font-manrope)" }}>1 950 ₽</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: text + features */}
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(63,184,175,0.2)", color: "var(--primary)",
              padding: "6px 14px", borderRadius: 100,
              fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 16,
            }}>
              💎 EXCLUSIVE · ТОЛЬКО У НАС НА РЫНКЕ
            </div>

            <h2 style={{ color: "white", marginBottom: 16 }}>
              Мобильное приложение,<br />
              <span style={{ color: "var(--primary)" }}>которого нет у конкурентов</span>
            </h2>

            <p style={{ fontSize: 17, color: "rgba(255,255,255,0.75)", marginBottom: 32, lineHeight: 1.6 }}>
              Управляйте бронями, копите бонусы, отслеживайте трансфер в реальном времени и приглашайте друзей за вознаграждение. Всё в одном приложении.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              {features.map((f, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12,
                  padding: 12,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div style={{ fontSize: 22 }}>{f.ico}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "white" }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="https://www.rustore.ru/catalog/app/com.uletnayaparkovka.app" target="_blank" rel="noopener" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "white", color: "var(--graphite)",
                padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
              }}>
                <span style={{ fontSize: 22 }}>🇷🇺</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>Скачать в</div>
                  <div>RuStore</div>
                </div>
              </a>
              <a href="#" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.08)", color: "white",
                padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
                border: "1px solid rgba(255,255,255,0.15)",
              }}>
                <span style={{ fontSize: 22 }}></span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>App Store</div>
                  <div>скоро</div>
                </div>
              </a>
              <a href="#" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.08)", color: "white",
                padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
                border: "1px solid rgba(255,255,255,0.15)",
              }}>
                <span style={{ fontSize: 22 }}>▶</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>Google Play</div>
                  <div>скоро</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .app-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
        }
      `}</style>
    </section>
  );
}
