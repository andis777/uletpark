import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://api.uletnayaparkovka.ru";
  const now = new Date();
  return [
    { url: `${base}/landing`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/b2b`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];
}
