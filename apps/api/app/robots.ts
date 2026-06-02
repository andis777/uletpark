import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/landing", "/b2b"], disallow: ["/admin", "/api"] },
    ],
    sitemap: "https://api.uletnayaparkovka.ru/sitemap.xml",
    host: "https://api.uletnayaparkovka.ru",
  };
}
