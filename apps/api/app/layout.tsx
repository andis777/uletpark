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

// Я.Метрика и GA — активируются ТОЛЬКО если задан YA_METRIKA_ID / GA_ID в env.
// Цели (reachGoal): calc_opened, calc_submitted, lead_sent, exit_intent_shown,
// exit_intent_submit, app_download, phone_click — настраиваются в кабинете метрики.
const YA_METRIKA_ID = process.env.NEXT_PUBLIC_YA_METRIKA_ID;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%233FB8AF'/%3E%3Cpath d='M9 22V10h6a4 4 0 0 1 0 8h-3v4H9zm3-7h3a1 1 0 0 0 0-2h-3v2z' fill='white'/%3E%3C/svg%3E" />
        {YA_METRIKA_ID && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YA_METRIKA_ID}', 'ym');
ym(${YA_METRIKA_ID}, 'init', { defer:true, clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true, ecommerce:'dataLayer' });
window.YM_ID = ${YA_METRIKA_ID};`,
              }}
            />
            <noscript>
              <div>
                <img src={`https://mc.yandex.ru/watch/${YA_METRIKA_ID}`} style={{ position: "absolute", left: "-9999px" }} alt="" />
              </div>
            </noscript>
          </>
        )}
        {GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`,
              }}
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
