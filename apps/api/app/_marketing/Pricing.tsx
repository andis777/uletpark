export function Pricing() {
  const plans = [
    {
      name: "Короткая",
      days: "1–3 дня",
      features: ["Трансфер 24/7", "Открытая стоянка", "Охрана", "Видеонаблюдение", "Договор хранения"],
      popular: false,
    },
    {
      name: "Средняя",
      days: "4–14 дней",
      features: ["Всё из тарифа «Короткая»", "Зал ожидания с Wi-Fi"],
      popular: true,
    },
    {
      name: "Длительная",
      days: "от 30 дней",
      features: ["Всё из тарифа «Средняя»", "Крытая стоянка", "Бесплатный запуск авто"],
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="section" style={{ background: "var(--surface-muted)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Прозрачные тарифы</div>
          <h2 style={{ color: "var(--graphite)", marginBottom: 12 }}>Чем дольше — тем дешевле</h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            Без скрытых платежей. Все услуги ниже включены в любой тариф.
          </p>
        </div>

        <div className="grid grid--3">
          {plans.map((plan, i) => (
            <div key={i} className="card" style={{
              padding: 32,
              border: plan.popular ? "2px solid var(--primary)" : "1px solid var(--divider)",
              transform: plan.popular ? "scale(1.02)" : "none",
              position: "relative",
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                  background: "var(--primary)", color: "white",
                  padding: "6px 16px", borderRadius: 100,
                  fontSize: 11, fontWeight: 700, letterSpacing: 1,
                }}>
                  ПОПУЛЯРНЫЙ
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--primary)", letterSpacing: 1 }}>{plan.days.toUpperCase()}</div>
                <h3 style={{ color: "var(--graphite)", fontSize: 26, marginTop: 4 }}>{plan.name}</h3>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: "var(--graphite)", fontFamily: "var(--font-manrope)" }}>Цена — по сроку поездки</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>Рассчитайте точную стоимость в приложении за минуту</div>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 10 }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                    <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: 16 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="#booking-form" className={plan.popular ? "btn btn--primary" : "btn btn--ghost"} style={{ width: "100%" }}>
                Забронировать →
              </a>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 40, padding: 24,
          background: "white", borderRadius: 16,
          borderLeft: "4px solid var(--primary)",
          display: "flex", gap: 16, alignItems: "flex-start",
        }}>
          <div style={{ fontSize: 28 }}>ℹ️</div>
          <div>
            <strong style={{ color: "var(--teal-deep)" }}>Что включено в любой тариф:</strong> бесплатный трансфер 24/7,
            охрана с видеонаблюдением, договор хранения, бесплатная парковка до 2 часов после прилёта (если задержался рейс),
            зал ожидания с Wi-Fi, питьевая вода и кофе.
          </div>
        </div>
      </div>
    </section>
  );
}
