export function Services() {
  return (
    <section id="services" className="section">
      <div className="container">
        <div style={{ marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Наши услуги</div>
          <h2 style={{ color: "var(--graphite)" }}>Два сервиса, один комфорт</h2>
        </div>

        <div className="grid grid--2">
          {/* Парковка */}
          <div className="card" style={{ padding: 32, position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: -40, right: -40, width: 200, height: 200,
              borderRadius: "50%", background: "var(--primary-soft)",
            }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🅿️</div>
              <h3 style={{ color: "var(--graphite)", fontSize: 24, marginBottom: 8 }}>Парковка с трансфером</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
                Оставьте машину, садитесь в трансфер. Через 5 минут — у терминала. Когда вернётесь — встретим и отвезём обратно.
              </p>
              <div style={{ fontSize: 32, fontWeight: 300, color: "var(--primary-dark)", fontFamily: "var(--font-manrope)", marginBottom: 16 }}>
                от 150 <span style={{ fontSize: 18, color: "var(--text-muted)" }}>₽/сутки</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 8 }}>
                {[
                  "Трансфер 24/7 туда-обратно",
                  "Открытая и крытая площадки",
                  "Видеонаблюдение + охрана",
                  "Договор хранения",
                  "До 2 ч бесплатно при задержке рейса",
                ].map((t, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span>{t}
                  </li>
                ))}
              </ul>
              <a href="#booking-form" className="btn btn--primary" style={{ width: "100%" }}>Забронировать парковку →</a>
            </div>
          </div>

          {/* Ночёвка */}
          <div className="card" style={{ padding: 32, position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: -40, right: -40, width: 200, height: 200,
              borderRadius: "50%", background: "rgba(217,148,65,0.08)",
            }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🛏️</div>
              <h3 style={{ color: "var(--graphite)", fontSize: 24, marginBottom: 8 }}>Улётная ночёвка</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
                Прилёт ночью? Между рейсами 8 часов? Отдохните в нашем комфортном номере у аэропорта. Душ, Wi-Fi, тишина.
              </p>
              <div style={{ fontSize: 32, fontWeight: 300, color: "var(--primary-dark)", fontFamily: "var(--font-manrope)", marginBottom: 16 }}>
                от 500 <span style={{ fontSize: 18, color: "var(--text-muted)" }}>₽ за 6 ч</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "grid", gap: 8 }}>
                {[
                  "Тарифы 6 / 12 / 24 часа",
                  "Душ, чистое бельё, Wi-Fi",
                  "Трансфер до терминала включён",
                  "Поминутный расчёт без переплат",
                  "Можно с домашним питомцем",
                ].map((t, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓</span>{t}
                  </li>
                ))}
              </ul>
              <a href="#booking-form" className="btn btn--ghost" style={{ width: "100%" }}>Забронировать ночёвку →</a>
            </div>
          </div>
        </div>

        {/* Дополнительные услуги */}
        <div style={{ marginTop: 56 }}>
          <h3 style={{ color: "var(--graphite)", marginBottom: 24, fontSize: 22 }}>А ещё в комплекте бесплатно:</h3>
          <div className="grid grid--3">
            {[
              { ico: "🔋", t: "Запуск авто", s: "если сел аккумулятор" },
              { ico: "💨", t: "Подкачка колёс", s: "перед поездкой" },
              { ico: "☕", t: "Зона ожидания", s: "Wi-Fi, чай, кофе" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{s.ico}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{s.t}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
