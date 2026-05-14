export function TrustBar() {
  const items = [
    { icon: "⭐", title: "4.9 / 5", sub: "Яндекс.Карты · 47+ отзывов" },
    { icon: "🛡", title: "Договор", sub: "хранения с печатью" },
    { icon: "🏆", title: "10 лет", sub: "на рынке (с 2016)" },
    { icon: "📱", title: "RuStore", sub: "приложение iOS / Android" },
    { icon: "✓", title: "ОГРН", sub: "юр. лицо в ЕГРЮЛ" },
  ];

  return (
    <section style={{ background: "var(--surface)", padding: "32px 0", borderBottom: "1px solid var(--divider)" }}>
      <div className="container">
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
          gap: 16,
        }} className="trustbar-grid">
          {items.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "8px 0",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--primary-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--graphite)" }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .trustbar-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
        }
      `}</style>
    </section>
  );
}
