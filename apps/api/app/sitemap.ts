import type { MetadataRoute } from "next";

const SITE = "https://uletnayaparkovka.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE}/landing`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${SITE}/parkovka-sheremetyevo`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/dolgaya-parkovka`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/tarify`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${SITE}/transfer-do-aeroporta`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/b2b`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
    { url: `${SITE}/landing#pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/landing#faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/landing#reviews`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
