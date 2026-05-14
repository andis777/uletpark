import { faqData } from "./FAQ";

export function StructuredData() {
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ParkingFacility"],
    name: "Улётная Парковка",
    image: "https://uletnayaparkovka.ru/og-image.jpg",
    "@id": "https://uletnayaparkovka.ru",
    url: "https://uletnayaparkovka.ru",
    telephone: "+79099148881",
    priceRange: "150-500 ₽",
    address: {
      "@type": "PostalAddress",
      streetAddress: "село Чашниково, территория база УСИМ",
      addressLocality: "Химки",
      addressRegion: "Московская область",
      postalCode: "141431",
      addressCountry: "RU",
    },
    geo: { "@type": "GeoCoordinates", latitude: 55.991, longitude: 37.422 },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      opens: "00:00", closes: "23:59",
    },
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "47", bestRating: "5" },
    sameAs: [
      "https://yandex.ru/maps/-/CDEM5L~D",
      "https://t.me/uletnayaparkovka",
      "https://wa.me/79099148881",
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
    </>
  );
}
