import { faqData } from "./faq-data";

const SITE = "https://uletnayaparkovka.ru";
const PHONE = "+79099148881";
const PHONE_DISPLAY = "+7 (909) 914-88-81";

export function StructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}#organization`,
    name: "Улётная Пит-стоп парковка",
    legalName: "ООО «Улётная Парковка»",
    url: SITE,
    logo: `${SITE}/logo.png`,
    image: `${SITE}/og-image.jpg`,
    foundingDate: "2015",
    description:
      "Охраняемая парковка у аэропорта Шереметьево с бесплатным трансфером 24/7. Работаем с 2015 года.",
    telephone: PHONE,
    email: "info@uletnayaparkovka.ru",
    address: {
      "@type": "PostalAddress",
      streetAddress: "село Чашниково, территория база УСИМ",
      addressLocality: "Химки",
      addressRegion: "Московская область",
      postalCode: "141431",
      addressCountry: "RU",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: PHONE,
        contactType: "customer service",
        areaServed: "RU",
        availableLanguage: ["Russian", "English"],
        hoursAvailable: "Mo-Su 00:00-23:59",
      },
    ],
    sameAs: [
      "https://yandex.ru/maps/-/CDEM5L~D",
      "https://t.me/uletnayaparkovka",
      "https://wa.me/79099148881",
      "https://vk.com/uletnayaparkovka",
    ],
  };

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ParkingFacility"],
    "@id": `${SITE}#parkingfacility`,
    name: "Улётная Пит-стоп парковка — Шереметьево",
    alternateName: ["Улётная Парковка Шереметьево", "Uletnaya Parking SVO"],
    image: [
      `${SITE}/og-image.jpg`,
      `${SITE}/photos/entry.jpg`,
      `${SITE}/photos/transfer.jpg`,
    ],
    url: SITE,
    telephone: PHONE,
    priceRange: "150–500 ₽/сутки",
    currenciesAccepted: "RUB",
    paymentAccepted: "Cash, Credit Card, Mir, SBP",
    address: {
      "@type": "PostalAddress",
      streetAddress: "село Чашниково, территория база УСИМ",
      addressLocality: "Химки",
      addressRegion: "Московская область",
      postalCode: "141431",
      addressCountry: "RU",
    },
    geo: { "@type": "GeoCoordinates", latitude: 55.991, longitude: 37.422 },
    hasMap: "https://yandex.ru/maps/-/CDEM5L~D",
    areaServed: [
      { "@type": "Airport", name: "Шереметьево", iataCode: "SVO" },
      { "@type": "City", name: "Москва" },
      { "@type": "City", name: "Химки" },
    ],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "247",
      bestRating: "5",
      worstRating: "1",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Бесплатный трансфер 24/7", value: true },
      { "@type": "LocationFeatureSpecification", name: "Охрана", value: true },
      { "@type": "LocationFeatureSpecification", name: "Видеонаблюдение", value: true },
      { "@type": "LocationFeatureSpecification", name: "Крытая стоянка", value: true },
      { "@type": "LocationFeatureSpecification", name: "Wi-Fi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Зал ожидания", value: true },
      { "@type": "LocationFeatureSpecification", name: "Договор хранения", value: true },
      { "@type": "LocationFeatureSpecification", name: "Можно с питомцем", value: true },
    ],
    parentOrganization: { "@id": `${SITE}#organization` },
    sameAs: [
      "https://yandex.ru/maps/-/CDEM5L~D",
      "https://t.me/uletnayaparkovka",
      "https://wa.me/79099148881",
    ],
  };

  const services = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE}#service-parking`,
    serviceType: "Парковка у аэропорта Шереметьево с трансфером",
    provider: { "@id": `${SITE}#parkingfacility` },
    areaServed: { "@type": "Airport", name: "Шереметьево", iataCode: "SVO" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "RUB",
      lowPrice: "150",
      highPrice: "300",
      offerCount: "3",
      offers: [
        {
          "@type": "Offer",
          name: "Тариф «Короткая» — 1–3 дня",
          price: "300",
          priceCurrency: "RUB",
          availability: "https://schema.org/InStock",
          url: `${SITE}/landing#pricing`,
          description: "Открытая стоянка, трансфер 24/7, охрана, видеонаблюдение, договор хранения",
        },
        {
          "@type": "Offer",
          name: "Тариф «Средняя» — 4–14 дней",
          price: "200",
          priceCurrency: "RUB",
          availability: "https://schema.org/InStock",
          url: `${SITE}/landing#pricing`,
          description: "Скидка 33% к базовой цене + зал ожидания с Wi-Fi",
        },
        {
          "@type": "Offer",
          name: "Тариф «Длительная» — от 30 дней",
          price: "150",
          priceCurrency: "RUB",
          availability: "https://schema.org/InStock",
          url: `${SITE}/landing#pricing`,
          description: "Крытая стоянка, скидка 50% к базовой, бесплатный запуск авто",
        },
      ],
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE}#faq`,
    mainEntity: faqData.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE },
      { "@type": "ListItem", position: 2, name: "Парковка Шереметьево", item: `${SITE}/landing` },
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}#website`,
    url: SITE,
    name: "Улётная Пит-стоп парковка",
    inLanguage: "ru-RU",
    publisher: { "@id": `${SITE}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE}/?s={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  void PHONE_DISPLAY;

  const blocks = [organization, localBusiness, services, faq, breadcrumbs, website];

  return (
    <>
      {blocks.map((b, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }}
        />
      ))}
    </>
  );
}
