import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "cyrillic"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "Парковка Шереметьево — Улётная Пит-стоп парковка · от 150 ₽/сут, трансфер 24/7",
  description: "Парковка Шереметьево с бесплатным трансфером 24/7. Договор хранения, 10 лет работаем. Бронь через мобильное приложение или сайт за 30 секунд.",
  metadataBase: new URL("https://uletnayaparkovka.ru"),
  openGraph: {
    title: "Парковка Шереметьево — Улётная Пит-стоп парковка",
    description: "Парковка от 150 ₽/сут. Трансфер 24/7. Договор хранения. 10 лет работаем.",
    type: "website",
    locale: "ru_RU",
    siteName: "Улётная Пит-стоп парковка",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%233FB8AF'/%3E%3Cpath d='M9 22V10h6a4 4 0 0 1 0 8h-3v4H9zm3-7h3a1 1 0 0 0 0-2h-3v2z' fill='white'/%3E%3C/svg%3E" />
      </head>
      <body>{children}</body>
    </html>
  );
}
