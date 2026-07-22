import type { MetadataRoute } from "next";

const SITE = "https://uletnayaparkovka.ru";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/landing", "/b2b", "/tarify", "/parkovka-sheremetyevo", "/dolgaya-parkovka", "/transfer-do-aeroporta"],
        disallow: ["/admin", "/api", "/_marketing", "/me", "/auth"],
      },
      {
        userAgent: "Yandex",
        allow: ["/", "/landing", "/b2b", "/tarify", "/parkovka-sheremetyevo", "/dolgaya-parkovka", "/transfer-do-aeroporta"],
        disallow: ["/admin", "/api", "/_marketing", "/me", "/auth"],
        crawlDelay: 1,
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/landing", "/b2b", "/tarify", "/parkovka-sheremetyevo", "/dolgaya-parkovka", "/transfer-do-aeroporta"],
        disallow: ["/admin", "/api", "/_marketing", "/me", "/auth"],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "Claude-Web", "PerplexityBot"],
        allow: ["/", "/landing", "/tarify", "/parkovka-sheremetyevo"],
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
