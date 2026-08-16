import { PartnerForm } from "./PartnerForm";

export const metadata = {
  title: "Партнёрам — подключите свою парковку · Улётная Парковка",
  description:
    "Подключаем парковки у аэропортов по всей России. Мы приводим брони, вы принимаете машины, комиссия — с каждого заказа.",
};

/**
 * Аудитория этой страницы — владельцы парковок, а не наши клиенты,
 * поэтому она открытая, без входа в кабинет.
 */
export default function PartnersPage() {
  return (
    <div style={wrap}>
      <h1 style={h1}>Подключите свою парковку</h1>
      <p style={lede}>
        Десять лет мы возим людей в Шереметьево и знаем, откуда берётся заказ на парковку
        у аэропорта. Теперь ищем площадки в других городах: трафик и бронирование — на нас,
        приём машин — на вас, комиссия — с каждого заказа, который мы привели.
      </p>

      <section style={cards}>
        {[
          ["Заказы, а не реклама", "Платите процент с брони, которую мы привели. Нет заказа — нет расходов."],
          ["Готовая машина продаж", "Сайт на 650+ страницах, приложение в App Store и Google Play, кабинет клиента."],
          ["Мы уже это умеем", "Своя парковка у Шереметьево с 2016 года: трансфер, диспетчерская, CRM."],
          ["Ваш аэропорт — ваш", "Мы не открываем свои площадки в вашем городе. Вы остаётесь хозяином."],
        ].map(([t, d]) => (
          <div key={t} style={cardBox}>
            <div style={cardT}>{t}</div>
            <div style={cardD}>{d}</div>
          </div>
        ))}
      </section>

      <section style={howBox}>
        <h2 style={h2}>Как это устроено</h2>
        <ol style={ol}>
          <li style={li}><b>Знакомимся.</b> Смотрим площадку, охрану, трансфер и загрузку.</li>
          <li style={li}><b>Договариваемся о комиссии.</b> Размер зависит от города и объёма — обсуждаем индивидуально.</li>
          <li style={li}><b>Заводим ваш аэропорт.</b> Страницы, приём броней, передача заказов вам.</li>
          <li style={li}><b>Считаем и платим.</b> Отчёт по броням и расчёт по итогам месяца.</li>
        </ol>
      </section>

      {/* Прямо и заранее: иначе люди тратят время на заявку, которую мы не примем. */}
      <div style={note}>
        <b>Кроме Шереметьево.</b> Это наш аэропорт — там мы работаем сами и площадки не подключаем.
        Все остальные города и аэропорты страны нам интересны.
      </div>

      <section style={formBox}>
        <h2 style={h2}>Оставьте заявку</h2>
        <p style={{ ...lede, fontSize: 14, marginBottom: 20 }}>
          Ответим в ближайший рабочий день и покажем, сколько заказов даём по вашему направлению.
        </p>
        <PartnerForm />
      </section>
    </div>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 860, margin: "0 auto", padding: "32px 16px 56px",
  fontFamily: "-apple-system, Segoe UI, Inter, Arial, sans-serif", color: "#14303f",
};
const h1: React.CSSProperties = { fontSize: 30, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.15, color: "#0f3b5d" };
const h2: React.CSSProperties = { fontSize: 19, fontWeight: 700, margin: "0 0 12px", color: "#0f3b5d" };
const lede: React.CSSProperties = { fontSize: 15.5, color: "#5c6b76", lineHeight: 1.6, margin: "0 0 24px" };
const cards: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginBottom: 26,
};
const cardBox: React.CSSProperties = { background: "#fff", border: "1px solid #e3ecee", borderRadius: 14, padding: "16px 18px" };
const cardT: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, color: "#0f3b5d", marginBottom: 6 };
const cardD: React.CSSProperties = { fontSize: 13, color: "#5c6b76", lineHeight: 1.5 };
const howBox: React.CSSProperties = { background: "#fff", border: "1px solid #e3ecee", borderRadius: 14, padding: "20px 22px", marginBottom: 16 };
const ol: React.CSSProperties = { margin: 0, paddingLeft: 20, color: "#5c6b76" };
const li: React.CSSProperties = { fontSize: 14, lineHeight: 1.65, marginBottom: 8 };
const note: React.CSSProperties = {
  background: "#fdf5ef", border: "1px solid #f3ddc9", borderRadius: 12,
  padding: "14px 16px", fontSize: 13.5, color: "#8a5a2b", lineHeight: 1.55, marginBottom: 26,
};
const formBox: React.CSSProperties = { background: "#fff", border: "1px solid #e3ecee", borderRadius: 14, padding: "22px 24px" };
