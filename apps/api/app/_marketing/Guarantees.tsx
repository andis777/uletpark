export function Guarantees() {
  const guards = [
    {
      icon: "✈️",
      title: "Не успели на самолёт — парковка БЕСПЛАТНО",
      desc: "До 2 часов задержки рейса не списываем ни копейки. Только у нас на рынке.",
      tag: "ЭКСКЛЮЗИВ",
    },
    {
      icon: "💰",
      title: "Нашли дешевле — пересмотрим цену",
      desc: "Гарантия лучшей цены. Покажите бронь конкурента — компенсируем разницу плюс премия.",
      tag: "BEST PRICE",
    },
    {
      icon: "🔄",
      title: "Бесплатная отмена за 24 часа",
      desc: "Передумали или поменялись планы? Возвращаем 100% за сутки до заезда без вопросов.",
      tag: "БЕЗ РИСКА",
    },
    {
      icon: "🛡",
      title: "Договор хранения с печатью",
      desc: "Юридический документ, а не просто «охрана». Страховка автомобиля на время хранения включена.",
      tag: "100% ОТВЕТСТВЕННОСТЬ",
    },
  ];

  return (
    <section className="section" style={{ background: "var(--surface-muted)" }}>
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Наши гарантии</div>
          <h2 style={{ color: "var(--graphite)", marginBottom: 12 }}>
            4 обещания, которые держим
          </h2>
          <p className="lead" style={{ margin: "0 auto" }}>
            Что мы делаем не словами, а контрактом. Не нашли таких условий у конкурентов? Мы не удивлены.
          </p>
        </div>

        <div className="grid grid--2">
          {guards.map((g, i) => (
            <div key={i} className="card" style={{ position: "relative", paddingTop: 32 }}>
              <span className="pill pill--primary" style={{ position: "absolute", top: 16, right: 16 }}>{g.tag}</span>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{g.icon}</div>
              <h3 style={{ color: "var(--teal-deep)", marginBottom: 10, fontSize: 19, lineHeight: 1.3 }}>{g.title}</h3>
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 15 }}>{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
