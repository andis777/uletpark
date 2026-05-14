export function Header() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--divider)",
    }}>
      <div className="container" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--primary)",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 18, boxShadow: "var(--shadow-md)",
          }}>У</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--graphite)", lineHeight: 1 }}>Улётная Парковка</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Шереметьево · 10 лет</div>
          </div>
        </a>

        <nav style={{ display: "flex", alignItems: "center", gap: 24 }} className="nav-desktop">
          <a href="#services" style={{ fontSize: 14, fontWeight: 500 }}>Услуги</a>
          <a href="#pricing" style={{ fontSize: 14, fontWeight: 500 }}>Тарифы</a>
          <a href="#reviews" style={{ fontSize: 14, fontWeight: 500 }}>Отзывы</a>
          <a href="#faq" style={{ fontSize: 14, fontWeight: 500 }}>Вопросы</a>
          <a href="tel:+79099148881" style={{ fontWeight: 700, fontSize: 14, color: "var(--graphite)" }}>+7 (909) 914-88-81</a>
          <a href="#hero" className="btn btn--primary" style={{ padding: "10px 18px", fontSize: 14 }}>Забронировать</a>
        </nav>

        <a href="tel:+79099148881" className="nav-mobile" style={{
          display: "none", padding: "10px 16px", borderRadius: 12,
          background: "var(--primary)", color: "white", fontSize: 13, fontWeight: 700,
        }}>📞 Позвонить</a>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}
