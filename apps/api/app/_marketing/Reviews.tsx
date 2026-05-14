export function Reviews() {
  const reviews = [
    { name: "Алексей Журавлёв", date: "2 недели назад", rating: 5, text: "Сервис огонь. Парковался у них уже 4 раза за год — всё чётко: трансфер встретил, машину получил без царапин. Рекомендую всем, кто часто летает.", source: "Яндекс.Карты" },
    { name: "Лика Малахова", date: "месяц назад", rating: 5, text: "Главное преимущество — расчёт идёт с момента заезда, а не как у всех с 14:00. У меня рейс ранний, заехала в 5 утра — и платила только за реальное время. Огромный плюс.", source: "Яндекс.Карты" },
    { name: "Сергей С.", date: "месяц назад", rating: 5, text: "Установил приложение — это просто шик. Видно когда трансфер выезжает, сколько баллов накопилось. У других парковок такого нет. Спасибо за технологии!", source: "RuStore" },
    { name: "Марина К.", date: "3 недели назад", rating: 5, text: "Бронировала ночёвку между рейсами. Душ, чистая кровать, тишина. За 800 рублей за 12 часов — лучше любого хостела у Шереметьево.", source: "2GIS" },
    { name: "Дмитрий П.", date: "неделю назад", rating: 5, text: "Самолёт задержали на 1.5 часа. Думал, спишут как все. А они «нет, бесплатно — у нас 2 часа после прилёта в подарок». Это уровень.", source: "Яндекс.Карты" },
    { name: "Ольга Н.", date: "вчера", rating: 5, text: "Десятый раз здесь, рекомендую всем коллегам. Договор хранения — реальный документ. Все 10 лет хожу — ни одной царапины, ни одной потери.", source: "Яндекс.Карты" },
  ];

  return (
    <section id="reviews" className="section">
      <div className="container">
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 24,
        }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Реальные отзывы</div>
            <h2 style={{ color: "var(--graphite)" }}>Что говорят клиенты</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 300, fontFamily: "var(--font-manrope)", color: "var(--primary-dark)", lineHeight: 1 }}>4.9</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>средняя оценка</div>
            </div>
            <div style={{ height: 40, width: 1, background: "var(--divider)" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 300, fontFamily: "var(--font-manrope)", color: "var(--primary-dark)", lineHeight: 1 }}>47+</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>отзывов</div>
            </div>
          </div>
        </div>

        <div className="grid grid--3">
          {reviews.map((r, i) => (
            <div key={i} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "var(--primary)", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 16,
                  }}>{r.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.date} · {r.source}</div>
                  </div>
                </div>
                <div style={{ color: "#f5a623", fontSize: 14 }}>★★★★★</div>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
                «{r.text}»
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <a href="https://yandex.ru/maps/-/CDEM5L~D" target="_blank" rel="noopener" className="btn btn--ghost">
            Все отзывы на Яндекс.Картах →
          </a>
        </div>
      </div>
    </section>
  );
}
