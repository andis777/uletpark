export function Comparison() {
  const rows = [
    { label: "Цена за 5 дней", us: "750 ₽ — 1 500 ₽", official: "4 000 ₽", competitor: "1 500 ₽ — 2 500 ₽" },
    { label: "Расстояние до терминала", us: "5 мин трансфером", official: "0 мин (в самом терминале)", competitor: "5–10 мин" },
    { label: "Бесплатный трансфер 24/7", us: "✓ с 1-го дня", official: "—", competitor: "от 4 дней" },
    { label: "Договор хранения", us: "✓", official: "—", competitor: "Не везде" },
    { label: "Мобильное приложение", us: "✓ RuStore + iOS + Android", official: "—", competitor: "Только Telegram-бот" },
    { label: "Бонусная программа", us: "✓ 1 ₽ = 1 балл", official: "—", competitor: "—" },
    { label: "До 2 ч бесплатно при задержке рейса", us: "✓", official: "—", competitor: "—" },
    { label: "Лет на рынке", us: "10 лет (с 2016)", official: "—", competitor: "2–5 лет" },
    { label: "Возврат за неиспользованные сутки", us: "100%", official: "—", competitor: "Не везде" },
  ];

  return (
    <section className="section" style={{ background: "var(--surface-muted)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Честное сравнение</div>
          <h2 style={{ color: "var(--graphite)", marginBottom: 12 }}>Почему мы, а не другие</h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            Сравните три варианта парковки у Шереметьево. Цифры говорят сами за себя.
          </p>
        </div>

        <div style={{
          background: "white", borderRadius: 20, overflow: "hidden",
          boxShadow: "var(--shadow-md)", border: "1px solid var(--divider)",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
            background: "var(--graphite)", color: "white",
            padding: "20px 24px",
          }} className="cmp-head">
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 }}>Параметр</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--primary)", color: "white", padding: "5px 12px", borderRadius: 100, fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>УЛЁТНАЯ</div>
            </div>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 }}>Официальная SVO</div>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", opacity: 0.7 }}>Конкуренты</div>
          </div>

          {rows.map((row, i) => (
            <div key={i} className="cmp-row" style={{
              display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr",
              padding: "16px 24px",
              borderBottom: i < rows.length - 1 ? "1px solid var(--divider)" : "none",
              background: i % 2 === 0 ? "white" : "var(--surface-tinted)",
            }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
              <div style={{ textAlign: "center", color: "var(--primary-dark)", fontWeight: 700, fontSize: 14 }}>
                {row.us}
              </div>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                {row.official}
              </div>
              <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                {row.competitor}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <a href="#booking-form" className="btn btn--primary btn--lg">Забронировать выгодную парковку →</a>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .cmp-head, .cmp-row { grid-template-columns: 1fr 1fr !important; gap: 12px; font-size: 13px !important; }
          .cmp-head > div:nth-child(3), .cmp-head > div:nth-child(4),
          .cmp-row > div:nth-child(3), .cmp-row > div:nth-child(4) { display: none; }
        }
      `}</style>
    </section>
  );
}
