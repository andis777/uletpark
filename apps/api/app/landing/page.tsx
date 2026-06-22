import type { Metadata } from "next";
import { TrustBar } from "../_marketing/TrustBar";
import { Hero } from "../_marketing/Hero";
import { Guarantees } from "../_marketing/Guarantees";
import { Services } from "../_marketing/Services";
import { AppShowcase } from "../_marketing/AppShowcase";
import { Reviews } from "../_marketing/Reviews";
import { Comparison } from "../_marketing/Comparison";
import { Pricing } from "../_marketing/Pricing";
import { FAQ } from "../_marketing/FAQ";
import { FinalCTA } from "../_marketing/FinalCTA";
import { Footer } from "../_marketing/Footer";
import { Header } from "../_marketing/Header";
import { StructuredData } from "../_marketing/StructuredData";

export const metadata: Metadata = {
  title: "Парковка Шереметьево с бесплатным трансфером 24/7 · Улётная Пит-стоп",
  description:
    "Охраняемая парковка у аэропорта Шереметьево (SVO) по выгодной цене. Бесплатный трансфер 24/7 до терминалов B, C, D, E за 5–7 минут. Договор хранения, видеонаблюдение, 10 лет работаем. Бронь за 30 секунд.",
  keywords: [
    "парковка Шереметьево",
    "парковка у аэропорта Шереметьево",
    "долгая парковка Шереметьево",
    "парковка SVO",
    "трансфер до Шереметьево",
    "парковка с трансфером Шереметьево",
    "охраняемая парковка Шереметьево",
    "парковка терминал B Шереметьево",
    "парковка терминал C Шереметьево",
    "парковка терминал D Шереметьево",
    "стоянка у Шереметьево",
    "перехватывающая парковка Шереметьево",
    "Улётная парковка",
    "парковка Чашниково",
    "пит-стоп парковка",
  ],
  authors: [{ name: "Улётная Пит-стоп парковка" }],
  creator: "Улётная Пит-стоп парковка",
  publisher: "Улётная Пит-стоп парковка",
  alternates: { canonical: "https://uletnayaparkovka.ru/landing" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Улётная Пит-стоп парковка",
    title: "Парковка Шереметьево · Трансфер 24/7",
    description:
      "Охраняемая парковка у Шереметьево. Бесплатный трансфер 24/7. Договор хранения. 10 лет работаем. Бронь за 30 секунд.",
    url: "https://uletnayaparkovka.ru/landing",
    images: [
      {
        url: "https://uletnayaparkovka.ru/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Улётная Пит-стоп парковка у аэропорта Шереметьево",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Парковка Шереметьево · Трансфер 24/7",
    description: "Охраняемая парковка у Шереметьево. Бесплатный трансфер 24/7. Выгодные тарифы.",
    images: ["https://uletnayaparkovka.ru/og-image.jpg"],
  },
  verification: {
    yandex: process.env.YANDEX_VERIFICATION,
    google: process.env.GOOGLE_VERIFICATION,
  },
  category: "transportation",
  other: {
    "geo.region": "RU-MOS",
    "geo.placename": "Химки, Чашниково",
    "geo.position": "55.991;37.422",
    ICBM: "55.991, 37.422",
    "yandex-verification": process.env.YANDEX_VERIFICATION ?? "",
  },
};

export default function LandingPage() {
  return (
    <>
      <StructuredData />
      <Header />
      <main>
        <Hero />
        <TrustBar />
        <Guarantees />
        <Services />
        <Pricing />
        <AppShowcase />
        <Reviews />
        <Comparison />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
