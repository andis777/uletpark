import type { Metadata } from "next";
import { Header } from "../_marketing/Header";
import { Footer } from "../_marketing/Footer";
import { TrustBar } from "../_marketing/TrustBar";
import { Guarantees } from "../_marketing/Guarantees";
import { FAQ } from "../_marketing/FAQ";
import { FinalCTA } from "../_marketing/FinalCTA";
import { StructuredData } from "../_marketing/StructuredData";

export const metadata: Metadata = {
  title: "Бесплатный трансфер до Шереметьево 24/7 · от парковки за 5–7 минут",
  description:
    "Бесплатный трансфер до аэропорта Шереметьево 24/7 — для всех клиентов Улётной парковки. Едем до терминалов B, C, D, E за 5–7 минут. Встречаем по прилёту со специальной табличкой.",
  keywords: [
    "трансфер до Шереметьево",
    "трансфер от парковки до Шереметьево",
    "бесплатный трансфер Шереметьево",
    "трансфер до терминала B Шереметьево",
    "трансфер до терминала D Шереметьево",
    "трансфер аэропорт Шереметьево",
  ],
  alternates: { canonical: "https://uletnayaparkovka.ru/transfer-do-aeroporta" },
  openGraph: {
    title: "Бесплатный трансфер до Шереметьево 24/7",
    description: "От парковки до терминалов B/C/D/E за 5–7 минут. Встречаем по прилёту.",
    url: "https://uletnayaparkovka.ru/transfer-do-aeroporta",
    type: "website",
    locale: "ru_RU",
  },
};

export default function TransferPage() {
  return (
    <>
      <StructuredData />
      <Header />
      <main>
        <TrustBar />
        <section className="section">
          <div className="container" style={{ maxWidth: 820 }}>
            <h1 style={{ fontSize: 36, marginBottom: 16 }}>
              Бесплатный трансфер от парковки до Шереметьево — круглосуточно
            </h1>
            <p className="lead" style={{ marginBottom: 24 }}>
              Для всех клиентов Улётной Пит-стоп парковки трансфер бесплатный и работает 24/7.
              От нашей стоянки в Чашниково до терминалов B, C, D и E — 5–7 минут езды.
              Машина с фирменной символикой, водитель помогает с багажом.
            </p>

            <h2 style={{ marginTop: 32 }}>Как это работает</h2>
            <ol style={{ lineHeight: 1.9 }}>
              <li>Приезжаете на парковку, оставляете машину под охрану и видеонаблюдение.</li>
              <li>Садитесь в наш трансфер — едем сразу к нужному терминалу Шереметьево.</li>
              <li>По возвращении — звоните по приезду, мы выезжаем встретить вас у выхода.</li>
              <li>Встречаем со специальной табличкой «Улётная Парковка» — не пропустите.</li>
              <li>Если рейс задержали — 2 часа бесплатной парковки после планового прилёта.</li>
            </ol>

            <h2 style={{ marginTop: 32 }}>До какого терминала Шереметьево довозит трансфер</h2>
            <p>
              До любого: <strong>B, C, D, E</strong>. Просто скажите водителю, в какой терминал
              вам нужно — он отвезёт прямо к нему. Возвращаемся за вами тоже к нужному терминалу.
            </p>
          </div>
        </section>
        <Guarantees />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
