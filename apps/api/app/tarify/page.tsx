import type { Metadata } from "next";
import { Header } from "../_marketing/Header";
import { Footer } from "../_marketing/Footer";
import { TrustBar } from "../_marketing/TrustBar";
import { Pricing } from "../_marketing/Pricing";
import { Comparison } from "../_marketing/Comparison";
import { FAQ } from "../_marketing/FAQ";
import { FinalCTA } from "../_marketing/FinalCTA";
import { StructuredData } from "../_marketing/StructuredData";

export const metadata: Metadata = {
  title: "Тарифы парковки Шереметьево · без скрытых платежей",
  description:
    "Тарифы парковки у Шереметьево: «Короткая» (1–3 дня), «Средняя» (4–14 дней), «Длительная» (от 30 дней). Чем дольше срок, тем выгоднее. Трансфер 24/7 включён. Без скрытых платежей.",
  keywords: [
    "тарифы парковки Шереметьево",
    "цены парковки Шереметьево",
    "стоимость парковки Шереметьево",
    "сколько стоит парковка Шереметьево",
    "тариф долгая парковка SVO",
    "цена за сутки парковки Шереметьево",
  ],
  alternates: { canonical: "https://uletnayaparkovka.ru/tarify" },
  openGraph: {
    title: "Тарифы парковки Шереметьево",
    description: "3 тарифа без скрытых платежей. Трансфер 24/7 включён в любой тариф.",
    url: "https://uletnayaparkovka.ru/tarify",
    type: "website",
    locale: "ru_RU",
  },
};

export default function TarifyPage() {
  return (
    <>
      <StructuredData />
      <Header />
      <main>
        <TrustBar />
        <section className="section">
          <div className="container" style={{ maxWidth: 820 }}>
            <h1 style={{ fontSize: 36, marginBottom: 16 }}>
              Тарифы парковки у Шереметьево — без скрытых платежей
            </h1>
            <p className="lead" style={{ marginBottom: 24 }}>
              Три прозрачных тарифа. Чем дольше срок — тем ниже цена за сутки. В любой тариф
              входят бесплатный трансфер 24/7, охрана, видеонаблюдение, договор хранения, зал
              ожидания и 2 часа бесплатной парковки после планового времени прилёта.
            </p>
          </div>
        </section>
        <Pricing />
        <Comparison />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
