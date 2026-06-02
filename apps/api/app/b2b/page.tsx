import { B2BForm } from "./B2BForm";

export const metadata = {
  title: "B2B парковка для компаний — Улётная Парковка у Шереметьево",
  description: "Корпоративный договор парковки у Шереметьево: безналичный расчёт, постоплата 30 дней, скидки от 10 машин, отчётность и закрывающие документы.",
  alternates: { canonical: "/b2b" },
};

export default function B2BLanding() {
  return (
    <>
      <header style={{
        background: "linear-gradient(135deg,#0f1419 0%,#1a3a35 50%,#0f4d47 100%)",
        color: "#fff",
        padding: "20px 0",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "#fff" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 18,
            }}>У</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Улётная Парковка</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Для бизнеса · B2B</div>
            </div>
          </a>
          <a href="tel:+79099148881" style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
            📞 +7 (909) 914-88-81
          </a>
        </div>
      </header>

      <section className="gradient-hero" style={{ padding: "80px 0", color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-200px", right: "-200px",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle,rgba(63,184,175,0.12),transparent 60%)",
        }} />
        <div className="container" style={{ position: "relative", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 56, alignItems: "center" }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(63,184,175,0.18)", color: "var(--primary)",
              padding: "6px 14px", borderRadius: 100,
              fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 20,
            }}>💼 КОРПОРАТИВНЫЕ КЛИЕНТЫ</div>
            <h1 style={{ color: "#fff", marginBottom: 20 }}>
              Парковка для<br />
              <span style={{ color: "var(--primary)" }}>вашего бизнеса</span>
            </h1>
            <p style={{ fontSize: 19, color: "rgba(255,255,255,0.85)", marginBottom: 32, maxWidth: 520, lineHeight: 1.5 }}>
              Договор, безналичный расчёт, постоплата 30 дней. Один кабинет на весь автопарк. Закрывающие документы для бухгалтерии.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32, maxWidth: 480 }}>
              {[
                { v: "−25%", t: "от 10 машин/мес" },
                { v: "30 дней", t: "постоплата" },
                { v: "Один договор", t: "на весь автопарк" },
                { v: "Закрывашки", t: "счёт-фактура, акт, УПД" },
              ].map((b, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  padding: "14px 16px", borderRadius: 12,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 300, color: "var(--primary)", fontFamily: "var(--font-manrope)" }}>{b.v}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{b.t}</div>
                </div>
              ))}
            </div>
          </div>
          <B2BForm />
        </div>
      </section>

      <section className="section" style={{ background: "var(--surface-muted)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Преимущества B2B</div>
            <h2 style={{ color: "var(--graphite)" }}>Что получает компания</h2>
          </div>
          <div className="grid grid--3">
            {[
              { i: "📋", t: "Договор хранения", d: "Юридический документ для каждой машины. Подходит для лизинга и автопарка." },
              { i: "💳", t: "Безналичный расчёт", d: "Счёт на оплату, акт выполненных работ. Закрывающие документы для бухгалтерии." },
              { i: "🗓", t: "Постоплата 30 дней", d: "Платите по факту в конце месяца, а не вперёд. Не замораживаете оборотные средства." },
              { i: "👥", t: "Один кабинет, много машин", d: "Мульти-водитель, мульти-машина. Корпоративный менеджер ведёт ваш счёт." },
              { i: "📊", t: "Месячный отчёт", d: "Excel со всеми бронями: водитель, машина, даты, стоимость, статус оплаты." },
              { i: "📈", t: "Скидки по объёму", d: "От 10 машин/мес — −15%. От 30 — −25%. От 100 — индивидуально." },
            ].map((f, i) => (
              <div key={i} className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{f.i}</div>
                <h3 style={{ fontSize: 18, marginBottom: 8, color: "var(--teal-deep)" }}>{f.t}</h3>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 14 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Кому подходит</div>
            <h2 style={{ color: "var(--graphite)" }}>Наши клиенты — это</h2>
          </div>
          <div className="grid grid--4">
            {[
              { i: "✈", t: "Авиакомпании", d: "Парковка экипажей перед сменой" },
              { i: "🚚", t: "Логистические компании", d: "Дальнобойщики между рейсами" },
              { i: "🏢", t: "Корпорации", d: "Командировки сотрудников" },
              { i: "🛂", t: "Иностранные представительства", d: "Гостевые визиты" },
              { i: "🤝", t: "Туроператоры", d: "Туры с авто из аэропорта" },
              { i: "🚗", t: "Каршеринги", d: "Распределение машин" },
              { i: "🏛", t: "Гос. учреждения", d: "Служебные авто" },
              { i: "📺", t: "Медиа / ТВ", d: "Парковка съёмочной техники" },
            ].map((f, i) => (
              <div key={i} style={{ textAlign: "center", padding: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{f.i}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{f.t}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section dark-section" style={{ background: "linear-gradient(180deg,var(--graphite),var(--teal-mid))" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ color: "#fff", marginBottom: 24 }}>Как начать работать с нами</h2>
          <div className="grid grid--4" style={{ marginTop: 40 }}>
            {[
              { n: "1", t: "Оставляете заявку", d: "Заполняете форму, мы перезваниваем в течение часа" },
              { n: "2", t: "Согласовываем условия", d: "Скидки по объёму, постоплата, доп. услуги" },
              { n: "3", t: "Подписываем договор", d: "Электронный документооборот или бумажный — как удобно" },
              { n: "4", t: "Начинаем работу", d: "Ваши водители уже могут парковаться, счёт в конце месяца" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.06)",
                padding: 24,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "left",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--primary)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, marginBottom: 12,
                }}>{s.n}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{s.t}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{
        background: "var(--graphite)", color: "#fff", padding: "32px 0",
        fontSize: 13, opacity: 0.8, textAlign: "center",
      }}>
        <div className="container">
          <p style={{ margin: "0 0 8px" }}>
            ИП Улётная Парковка · ОГРНИП 316774600421050 · ИНН 770170200000
          </p>
          <p style={{ margin: 0, opacity: 0.6 }}>
            Московская обл., г.о. Химки, с. Чашниково · <a href="tel:+79099148881" style={{ color: "var(--primary)" }}>+7 (909) 914-88-81</a>
          </p>
        </div>
      </footer>
    </>
  );
}
