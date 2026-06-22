import type { Metadata } from "next";
import { Header } from "../_marketing/Header";
import { Footer } from "../_marketing/Footer";
import { Hero } from "../_marketing/Hero";
import { TrustBar } from "../_marketing/TrustBar";
import { Pricing } from "../_marketing/Pricing";
import { Guarantees } from "../_marketing/Guarantees";
import { FAQ } from "../_marketing/FAQ";
import { FinalCTA } from "../_marketing/FinalCTA";
import { StructuredData } from "../_marketing/StructuredData";

export const metadata: Metadata = {
  title: "Парковка у аэропорта Шереметьево — охраняемая, с трансфером 24/7",
  description:
    "Парковка возле Шереметьево в 7 км от терминалов. Бесплатный трансфер 24/7 до B/C/D/E за 5–7 минут. Охрана, видеонаблюдение, договор хранения. Выгодная цена за сутки. Бронь онлайн за 30 секунд.",
  keywords: [
    "парковка Шереметьево",
    "парковка у аэропорта Шереметьево",
    "парковка возле Шереметьево",
    "парковка рядом с Шереметьево",
    "охраняемая парковка Шереметьево",
    "парковка SVO",
    "парковка терминал B",
    "парковка терминал C",
    "парковка терминал D",
    "парковка терминал E",
  ],
  alternates: { canonical: "https://uletnayaparkovka.ru/parkovka-sheremetyevo" },
  openGraph: {
    title: "Парковка у аэропорта Шереметьево · трансфер 24/7",
    description: "Охраняемая парковка у Шереметьево с бесплатным трансфером до терминалов B/C/D/E.",
    url: "https://uletnayaparkovka.ru/parkovka-sheremetyevo",
    type: "website",
    locale: "ru_RU",
  },
};

export default function ParkovkaSheremetyevoPage() {
  return (
    <>
      <StructuredData />
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <section className="section">
          <div className="container" style={{ maxWidth: 820 }}>
            <h1 style={{ fontSize: 36, marginBottom: 16 }}>
              Парковка у аэропорта Шереметьево — охрана, трансфер, договор хранения
            </h1>
            <p className="lead" style={{ marginBottom: 24 }}>
              Улётная Пит-стоп парковка расположена в селе Чашниково — 7 км от терминалов
              Шереметьево. Бесплатный трансфер довозит до терминала B, C, D или E за 5–7 минут
              и работает круглосуточно. Машину принимаем по договору хранения, под охраной
              и видеонаблюдением.
            </p>

            <h2 style={{ marginTop: 32 }}>Почему оставить машину у нас выгоднее, чем на P1–P7</h2>
            <ul style={{ lineHeight: 1.9 }}>
              <li>Заметно выгоднее официальных парковок Шереметьево.</li>
              <li>Трансфер 24/7 включён в стоимость — не нужно тащить чемоданы по терминалу.</li>
              <li>Договор хранения — юридический документ, страховка работает по нему.</li>
              <li>Охрана с видеонаблюдением по всему периметру, контроль 24/7.</li>
              <li>2 часа бесплатно после планового времени прилёта — на случай задержки.</li>
            </ul>

            <h2 style={{ marginTop: 32 }}>Как доехать до парковки от Москвы</h2>
            <p>
              По Ленинградскому шоссе или М11 до съезда на село Чашниково. От МКАД — 25 минут
              без пробок. От нас до Шереметьево — 7 км, трансфер 5–7 минут. Координаты для
              навигатора: 55.991, 37.422.
            </p>

            <h2 style={{ marginTop: 32 }}>Бронирование в один клик</h2>
            <p>
              Бронируйте через калькулятор на главной или в мобильном приложении — забронировать
              можно за 30 секунд, оплата при заезде. Программа лояльности: 1 ₽ потраченный = 1 балл,
              баллами можно частично оплачивать следующую бронь.
            </p>
          </div>
        </section>
        <Guarantees />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
